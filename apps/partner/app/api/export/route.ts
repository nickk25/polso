import { NextRequest, NextResponse } from "next/server"
import { getPartnerAuthContext } from "@/lib/auth"
import { getExportableData } from "@/features/export/queries/get-exportable-data"
import { generateCsv } from "@/features/export/lib/csv-generator"
import { prisma } from "@/lib/db"

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

    // Use separator from URL param, fall back to org preference
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

    const csv = generateCsv(rows, sep)
    const fileName = `polso-export-${clientId}-${from}-${to}.csv`

    // Log export history (fire-and-forget, don't block the response)
    prisma.export.create({
      data: {
        organizationId: clientId,
        name: `${from} — ${to}`,
        filePath: `csv:clientId=${clientId}&from=${from}&to=${to}`,
        startDate: new Date(from),
        endDate: new Date(to),
        expenseCount: rows.length,
        status: "completed",
        completedAt: new Date(),
        generatedByOrgId: ctx.organizationId,
        includesPdf: false,
        includesInvoices: false,
      },
    }).catch(() => {})

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (e) {
    console.error("[export]", e)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
