"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { uploadExport, getFile } from "@/lib/storage/r2"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { generateCSV, generateExportFileName, generateInvoiceFileName } from "../lib/csv-generator"
import { generatePDF } from "../lib/pdf-generator"
import { generateZip, type ZipFile } from "../lib/zip-generator"
import { getExpensesForExport, getExportPreview } from "../queries/get-exports"
import { format } from "date-fns"

export interface CreateExportInput {
  startDate: Date
  endDate: Date
  includesCsv?: boolean
  includesPdf?: boolean
  includesInvoices?: boolean
}

export interface CreateExportResult {
  exportId: string
  downloadUrl: string
  fileName: string
  expenseCount: number
  invoiceCount: number
  fileSize: number
}

export async function createExportAction(
  input: CreateExportInput
): Promise<ActionResponse<CreateExportResult>> {
  const { organizationId } = await getAuthContext()

  const includesCsv = input.includesCsv !== false
  const includesPdf = input.includesPdf !== false
  const includesInvoices = input.includesInvoices !== false

  // Parse dates - they come as ISO strings from client
  const startParsed = new Date(input.startDate)
  const endParsed = new Date(input.endDate)

  // Create date range covering full days in UTC
  const startDate = new Date(Date.UTC(
    startParsed.getUTCFullYear(),
    startParsed.getUTCMonth(),
    startParsed.getUTCDate(),
    0, 0, 0, 0
  ))
  const endDate = new Date(Date.UTC(
    endParsed.getUTCFullYear(),
    endParsed.getUTCMonth(),
    endParsed.getUTCDate(),
    23, 59, 59, 999
  ))

  // Generate export name
  const exportName = generateExportFileName(startDate, endDate, "zip")

  // Create export record with "processing" status
  const exportRecord = await prisma.export.create({
    data: {
      organizationId,
      name: exportName,
      filePath: "", // Will be updated after upload
      startDate,
      endDate,
      includesCsv,
      includesPdf,
      includesInvoices,
      status: "processing",
    },
  })

  try {
    // Fetch expenses for the period
    const expenses = await getExpensesForExport(startDate, endDate)

    if (expenses.length === 0) {
      // Update export as failed
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          status: "failed",
          errorMessage: "No hay gastos en el periodo seleccionado",
        },
      })
      return errorResponse("No hay gastos en el periodo seleccionado", "NO_DATA")
    }

    // Get organization name for PDF
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    // Get preview data for totals
    const preview = await getExportPreview(startDate, endDate)

    // Build files for ZIP
    const zipFiles: ZipFile[] = []

    // 1. Generate CSV
    if (includesCsv) {
      const csvContent = generateCSV(expenses)
      zipFiles.push({
        name: "gastos.csv",
        content: csvContent,
      })
    }

    // 2. Generate PDF
    if (includesPdf) {
      const pdfBuffer = await generatePDF({
        organizationName: organization?.name || "Mi Empresa",
        startDate,
        endDate,
        expenses,
        totals: {
          total: preview.totalAmount,
          fixed: preview.fixedAmount,
          variable: preview.variableAmount,
          currency: preview.currency,
          byCategory: preview.categoryBreakdown,
        },
      })
      zipFiles.push({
        name: "resumen.pdf",
        content: pdfBuffer,
      })
    }

    // 3. Collect invoice files from R2
    let invoiceCount = 0
    if (includesInvoices) {
      const invoicePromises: Promise<void>[] = []

      for (const expense of expenses) {
        for (const invoice of expense.invoices) {
          invoicePromises.push(
            (async () => {
              try {
                const { body } = await getFile(invoice.filePath)

                // Get extension from original filename or mime type
                const ext = invoice.fileName.split(".").pop() ||
                  (invoice.mimeType?.includes("pdf") ? "pdf" : "jpg")

                // Generate consistent filename
                const fileName = generateInvoiceFileName(
                  expense.date,
                  expense.vendor?.name || null,
                  expense.amount,
                  ext
                )

                zipFiles.push({
                  name: fileName,
                  content: Buffer.from(body),
                  folder: "facturas",
                })

                invoiceCount++
              } catch (error) {
                console.error(`Failed to fetch invoice ${invoice.id}:`, error)
                // Skip this invoice but continue with others
              }
            })()
          )
        }
      }

      // Fetch all invoices in parallel (with concurrency limit)
      await Promise.all(invoicePromises)
    }

    // 4. Create ZIP
    const { buffer: zipBuffer, size: zipSize } = await generateZip(zipFiles)

    // 5. Upload ZIP to R2
    const uploadResult = await uploadExport(
      organizationId,
      exportRecord.id,
      exportName,
      zipBuffer,
      "application/zip"
    )

    // 6. Update export record
    await prisma.export.update({
      where: { id: exportRecord.id },
      data: {
        filePath: uploadResult.key,
        fileSize: zipSize,
        expenseCount: expenses.length,
        invoiceCount,
        status: "completed",
        completedAt: new Date(),
      },
    })

    revalidatePath("/export")

    return successResponse({
      exportId: exportRecord.id,
      downloadUrl: `/api/exports/${exportRecord.id}`,
      fileName: exportName,
      expenseCount: expenses.length,
      invoiceCount,
      fileSize: zipSize,
    })
  } catch (error) {
    console.error("Error creating export:", error)

    // Update export as failed
    await prisma.export.update({
      where: { id: exportRecord.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Error desconocido",
      },
    })

    return errorResponse(
      error instanceof Error ? error.message : "Error al crear la exportacion",
      "ERROR"
    )
  }
}

export async function getExportPreviewAction(
  startDate: Date,
  endDate: Date
): Promise<ActionResponse<{
  expenseCount: number
  invoiceCount: number
  totalAmount: number
  fixedAmount: number
  variableAmount: number
  currency: string
}>> {
  try {
    // Parse dates - they come as ISO strings from client
    const startParsed = new Date(startDate)
    const endParsed = new Date(endDate)

    // Create date range covering full days
    // Use the date parts only, set to start/end of day in UTC
    const start = new Date(Date.UTC(
      startParsed.getUTCFullYear(),
      startParsed.getUTCMonth(),
      startParsed.getUTCDate(),
      0, 0, 0, 0
    ))
    const end = new Date(Date.UTC(
      endParsed.getUTCFullYear(),
      endParsed.getUTCMonth(),
      endParsed.getUTCDate(),
      23, 59, 59, 999
    ))

    console.log("[Export Preview] Date range:", { start: start.toISOString(), end: end.toISOString() })

    const preview = await getExportPreview(start, end)

    console.log("[Export Preview] Result:", { expenseCount: preview.expenseCount, invoiceCount: preview.invoiceCount })

    return successResponse({
      expenseCount: preview.expenseCount,
      invoiceCount: preview.invoiceCount,
      totalAmount: preview.totalAmount,
      fixedAmount: preview.fixedAmount,
      variableAmount: preview.variableAmount,
      currency: preview.currency,
    })
  } catch (error) {
    console.error("Error getting export preview:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al obtener vista previa",
      "ERROR"
    )
  }
}

export async function deleteExportAction(
  exportId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify export belongs to organization
    const exportRecord = await prisma.export.findFirst({
      where: {
        id: exportId,
        organizationId,
      },
    })

    if (!exportRecord) {
      return errorResponse("Export not found", "NOT_FOUND")
    }

    // Delete from R2 if file exists
    if (exportRecord.filePath) {
      try {
        const { deleteFile } = await import("@/lib/storage/r2")
        await deleteFile(exportRecord.filePath)
      } catch (error) {
        console.error("Error deleting export file from R2:", error)
      }
    }

    // Delete from database
    await prisma.export.delete({
      where: { id: exportId },
    })

    revalidatePath("/export")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error deleting export:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al eliminar exportacion",
      "ERROR"
    )
  }
}
