"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { uploadExport, getFile } from "@/lib/storage/r2"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { generateCSV, generateExportFileName, generateInvoiceFileName } from "../lib/csv-generator"
import { generatePDF } from "../lib/pdf-generator"
import { generateZip, type ZipFile } from "../lib/zip-generator"
import { getExpensesForExport, getExportPreview, type EntryForExport } from "../queries/get-exports"
import { format } from "date-fns"

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function toUtcDayEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export interface CreateExportInput {
  startDate: Date
  endDate: Date
  includesCsv?: boolean
  includesPdf?: boolean
  includesInvoices?: boolean
  csvSeparator?: string
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
  let exportRecord: { id: string } | null = null
  try {
    const { organizationId } = await getAuthContext()

    const includesCsv = input.includesCsv !== false
    const includesPdf = input.includesPdf !== false
    const includesInvoices = input.includesInvoices !== false
    const csvSeparator = input.csvSeparator || ";"

    const startDate = toUtcDayStart(new Date(input.startDate))
    const endDate = toUtcDayEnd(new Date(input.endDate))
    const exportName = generateExportFileName(startDate, endDate, "zip")

    exportRecord = await prisma.export.create({
      data: {
        organizationId,
        name: exportName,
        filePath: "",
        startDate,
        endDate,
        includesCsv,
        includesPdf,
        includesDocuments: includesInvoices,
        status: "processing",
      },
    })

    const expenses = await getExpensesForExport(startDate, endDate)

    if (expenses.length === 0) {
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: { status: "failed", errorMessage: "No hay gastos en el periodo seleccionado" },
      })
      return errorResponse("No hay gastos en el periodo seleccionado", "NO_DATA")
    }

    const [organization, preview] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      getExportPreview(startDate, endDate),
    ])

    const zipFiles: ZipFile[] = []

    if (includesCsv) {
      zipFiles.push({ name: "gastos.csv", content: generateCSV(expenses, csvSeparator) })
    }

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
      zipFiles.push({ name: "resumen.pdf", content: pdfBuffer })
    }

    let invoiceCount = 0
    if (includesInvoices) {
      const invoicePromises: Promise<void>[] = []

      for (const expense of expenses) {
        for (const doc of expense.documents) {
          invoicePromises.push(
            (async () => {
              try {
                const { body } = await getFile(doc.filePath)
                const ext = doc.fileName.split(".").pop() ||
                  (doc.mimeType?.includes("pdf") ? "pdf" : "jpg")
                zipFiles.push({
                  name: generateInvoiceFileName(expense.date, expense.counterparty?.name || null, expense.amount, ext),
                  content: Buffer.from(body),
                  folder: "facturas",
                })
                invoiceCount++
              } catch (error) {
                console.error(`Failed to fetch document ${doc.id}:`, error)
                // skip on fetch failure, continue with remaining documents
              }
            })()
          )
        }
      }

      await Promise.all(invoicePromises)
    }

    const { buffer: zipBuffer, size: zipSize } = await generateZip(zipFiles)
    const uploadResult = await uploadExport(organizationId, exportRecord.id, exportName, zipBuffer, "application/zip")

    await prisma.export.update({
      where: { id: exportRecord.id },
      data: {
        filePath: uploadResult.key,
        fileSize: zipSize,
        entryCount: expenses.length,
        documentCount: invoiceCount,
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
    if (exportRecord) {
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
        },
      })
    }
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
    const start = toUtcDayStart(new Date(startDate))
    const end = toUtcDayEnd(new Date(endDate))

    const preview = await getExportPreview(start, end)

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

    const exportRecord = await prisma.export.findFirst({
      where: { id: exportId, organizationId },
    })

    if (!exportRecord) {
      return errorResponse("Export not found", "NOT_FOUND")
    }

    if (exportRecord.filePath) {
      try {
        const { deleteFile } = await import("@/lib/storage/r2")
        await deleteFile(exportRecord.filePath)
      } catch (error) {
        console.error("Error deleting export file from R2:", error)
      }
    }

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
