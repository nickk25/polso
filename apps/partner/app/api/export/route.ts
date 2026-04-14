import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { getPartnerAuthContext } from "@/lib/auth"
import { getExportableData } from "@/features/export/queries/get-exportable-data"
import { generateCsv, generateInvoiceFileName } from "@/features/export/lib/csv-generator"
import { generateZip, type ZipFile } from "@/features/export/lib/zip-generator"
import { getFile, uploadExport } from "@polso/storage"
import { prisma } from "@/lib/db"
import { format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const clientId = searchParams.get("clientId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (!clientId || !from || !to) {
      return new NextResponse("Missing required params", { status: 400 })
    }

    // Read CSV separator from org preference
    let sep = searchParams.get("sep")
    if (!sep) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { csvSeparator: true },
      })
      sep = org?.csvSeparator ?? ";"
    }

    const rows = await getExportableData(
      ctx.organizationId,
      clientId,
      new Date(from),
      new Date(to)
    )

    // Build ZIP: CSV at root + fetched attachments in facturas/
    const zipFiles: ZipFile[] = [
      { name: "transacciones.csv", content: "\uFEFF" + generateCsv(rows, sep) },
    ]

    await Promise.all(
      rows
        .filter((r) => r.attachmentFilePath)
        .map(async (row) => {
          try {
            const { body } = await getFile(row.attachmentFilePath!)
            const ext = row.attachmentFileName?.split(".").pop() ?? "pdf"
            const name = generateInvoiceFileName(row.date, row.vendorName, row.amount, ext)
            zipFiles.push({ name, content: Buffer.from(body), folder: "facturas" })
          } catch {
            // Skip missing files — don't fail the whole export
          }
        })
    )

    const { buffer } = await generateZip(zipFiles)

    const startStr = format(new Date(from), "yyyy-MM-dd")
    const endStr = format(new Date(to), "yyyy-MM-dd")
    const fileName = `polso-export-${startStr}_${endStr}.zip`

    // Fire-and-forget: upload to R2 + create Export record for history
    const exportId = nanoid()
    uploadExport(clientId, exportId, fileName, buffer, "application/zip")
      .then(({ key }) =>
        prisma.export.create({
          data: {
            organizationId: clientId,
            name: `${from} — ${to}`,
            filePath: key,
            startDate: new Date(from),
            endDate: new Date(to),
            expenseCount: rows.length,
            invoiceCount: zipFiles.length - 1, // exclude the CSV itself
            status: "completed",
            completedAt: new Date(),
            generatedByOrgId: ctx.organizationId,
            includesPdf: false,
            includesInvoices: true,
          },
        })
      )
      .catch(console.error)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (e) {
    console.error("[export]", e)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
