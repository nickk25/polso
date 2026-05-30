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

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const transactionId = formData.get("transactionId") as string | null

    if (!file || !transactionId) {
      return NextResponse.json({ error: "Missing file or transactionId" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, organizationId: userOrg.organizationId },
      select: { id: true, entry: { select: { id: true } } },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueFileName = `${randomUUID()}_${sanitizedFileName}`
    const key = `transaction-documents/${userOrg.organizationId}/${transactionId}/${uniqueFileName}`

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, fileBuffer, file.type)

    // Create document record and mark entry as verified
    const [doc] = await prisma.$transaction([
      prisma.transactionDocument.create({
        data: {
          organizationId: userOrg.organizationId,
          transactionId,
          fileName: file.name,
          filePath: key,
          fileSize: file.size,
          mimeType: file.type,
        },
      }),
      ...(transaction.entry
        ? [prisma.entry.update({ where: { id: transaction.entry.id }, data: { status: "verified" } })]
        : []),
    ])

    const downloadUrl = await getSignedDownloadUrl(key, 3600)

    return NextResponse.json({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      downloadUrl,
    })
  } catch (error) {
    console.error("Error uploading transaction document:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
