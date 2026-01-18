import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { uploadFile, getSignedDownloadUrl } from "@/lib/storage/r2"
import { randomUUID } from "crypto"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Upload a file to R2 (proxied through server to avoid CORS)
 * Security: Verifies expense belongs to user's organization
 */
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const expenseId = formData.get("expenseId") as string | null

    if (!file || !expenseId) {
      return NextResponse.json(
        { error: "Missing file or expenseId" },
        { status: 400 }
      )
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Verify expense belongs to organization
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        organizationId: userOrg.organizationId,
      },
      select: { id: true },
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    // Generate unique key with UUID to prevent overwrites
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${randomUUID()}_${sanitizedFileName}`
    const key = `invoices/${userOrg.organizationId}/${expenseId}/${uniqueFileName}`

    // Upload to R2
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, fileBuffer, file.type)

    // Create the invoice record and mark expense as documented
    const [invoice] = await prisma.$transaction([
      prisma.expenseInvoice.create({
        data: {
          organizationId: userOrg.organizationId,
          expenseId,
          fileName: file.name,
          filePath: key,
          fileSize: file.size,
          mimeType: file.type,
        },
      }),
      prisma.expense.update({
        where: { id: expenseId },
        data: { status: "documented" },
      }),
    ])

    // Get signed download URL
    const downloadUrl = await getSignedDownloadUrl(key, 3600)

    return NextResponse.json({
      id: invoice.id,
      fileName: invoice.fileName,
      filePath: invoice.filePath,
      fileSize: invoice.fileSize,
      mimeType: invoice.mimeType,
      createdAt: invoice.createdAt,
      downloadUrl,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
