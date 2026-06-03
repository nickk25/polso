import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getFile } from "@polso/storage"

// No auth required — logos are public branding (used in client emails)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { logoFilePath: true },
    })

    if (!org?.logoFilePath) {
      return new NextResponse("Not found", { status: 404 })
    }

    const { body, contentType } = await getFile(org.logoFilePath)

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType ?? "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Org logo download error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
