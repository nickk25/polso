import { NextRequest, NextResponse } from "next/server"
import { getPartnerAuthContext } from "@/lib/auth"
import { getFile } from "@polso/storage"
import { prisma } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params

    const exportRecord = await prisma.export.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        filePath: true,
        organizationId: true,
        generatedByOrgId: true,
      },
    })

    if (!exportRecord) return new NextResponse("Not found", { status: 404 })

    // Verify this partner generated the export or has an active link to the client
    const hasAccess =
      exportRecord.generatedByOrgId === ctx.organizationId ||
      !!(await prisma.partnerClient.findFirst({
        where: {
          partnerId: ctx.organizationId,
          clientId: exportRecord.organizationId,
          status: "active",
        },
      }))

    if (!hasAccess) return new NextResponse("Forbidden", { status: 403 })

    const { body } = await getFile(exportRecord.filePath)
    const fileName = exportRecord.name.replace(/\s/g, "-") + ".zip"

    return new NextResponse(new Uint8Array(Buffer.from(body)), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("[exports/id]", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
