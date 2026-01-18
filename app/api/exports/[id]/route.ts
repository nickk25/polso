import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getFile } from "@/lib/storage/r2"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Download an export file (proxied through server to avoid CORS)
 * Security: Verifies export belongs to user's organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get organization for user
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    const { id } = await params

    // Verify export belongs to organization
    const exportRecord = await prisma.export.findFirst({
      where: {
        id,
        organizationId: userOrg.organizationId,
        status: "completed",
      },
      select: {
        id: true,
        name: true,
        filePath: true,
        fileSize: true,
      },
    })

    if (!exportRecord) {
      return NextResponse.json(
        { error: "Export not found" },
        { status: 404 }
      )
    }

    if (!exportRecord.filePath) {
      return NextResponse.json(
        { error: "Export file not available" },
        { status: 404 }
      )
    }

    // Get file from R2
    const { body } = await getFile(exportRecord.filePath)

    // Return file with download headers
    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${exportRecord.name}"`,
        "Content-Length": String(exportRecord.fileSize || body.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error downloading export:", error)
    return NextResponse.json(
      { error: "Failed to download export" },
      { status: 500 }
    )
  }
}
