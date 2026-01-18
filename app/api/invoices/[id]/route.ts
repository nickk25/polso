import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getFile } from "@/lib/storage/r2"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Download an invoice file (proxied through server to avoid CORS)
 * Security: Verifies invoice belongs to user's organization
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

    // Verify invoice belongs to organization (dual-condition security)
    const invoice = await prisma.expenseInvoice.findFirst({
      where: {
        id,
        organizationId: userOrg.organizationId,
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Get file from R2
    const { body, contentType } = await getFile(invoice.filePath)

    // Return file with appropriate headers (convert Uint8Array to Buffer for NextResponse)
    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType || invoice.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${invoice.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }
}
