import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getFile } from "@/lib/storage/r2"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Download an inbox item file (proxied through server to avoid CORS)
 * Security: Verifies inbox item belongs to user's organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    if (!userOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const { id } = await params

    const item = await prisma.inboxItem.findFirst({
      where: {
        id,
        organizationId: userOrg.organizationId,
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        contentType: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { body, contentType } = await getFile(item.filePath)

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType || item.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${item.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error downloading inbox file:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
