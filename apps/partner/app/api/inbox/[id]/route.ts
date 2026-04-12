import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getFile } from "@polso/storage"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await neonAuth()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = await params

    const item = await prisma.inboxItem.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        contentType: true,
        organizationId: true,
      },
    })

    if (!item) return new NextResponse("Not found", { status: 404 })

    // Verify partner has an active link to this client
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    if (!userOrg) return new NextResponse("Unauthorized", { status: 401 })

    const link = await prisma.partnerClient.findFirst({
      where: {
        partnerId: userOrg.organizationId,
        clientId: item.organizationId,
        status: "active",
      },
    })

    if (!link) return new NextResponse("Forbidden", { status: 403 })

    const { body, contentType } = await getFile(item.filePath)

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType ?? item.contentType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${item.fileName}"`,
      },
    })
  } catch (error) {
    console.error("Inbox file download error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
