import { NextRequest, NextResponse } from "next/server"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { uploadFile, getSignedDownloadUrl } from "@/lib/storage/r2"
import { randomUUID } from "crypto"

import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

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

    if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type` }, { status: 400 })
    }

    if (file.size > UPLOAD_MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, organizationId: userOrg.organizationId },
      select: { id: true, entry: { select: { id: true } } },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
    const key = `inbox/${userOrg.organizationId}/${randomUUID()}.${ext}`

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, fileBuffer, file.type)

    // Create InboxItem + TransactionAttachment so the doc appears in both vault and drawer
    const inboxItem = await prisma.$transaction(async (tx) => {
      const item = await tx.inboxItem.create({
        data: {
          organizationId: userOrg.organizationId,
          fileName: file.name,
          filePath: key,
          contentType: file.type,
          size: file.size,
          status: "done",
          source: "upload",
          transactionId,
        },
      })

      await tx.transactionAttachment.create({
        data: { transactionId, inboxItemId: item.id },
      })

      if (transaction.entry) {
        await tx.entry.update({
          where: { id: transaction.entry.id },
          data: { status: "verified" },
        })
      }

      return item
    })

    const downloadUrl = await getSignedDownloadUrl(key, 3600)

    return NextResponse.json({
      id: inboxItem.id,
      fileName: inboxItem.fileName,
      filePath: inboxItem.filePath,
      fileSize: inboxItem.size,
      mimeType: inboxItem.contentType,
      createdAt: inboxItem.createdAt,
      downloadUrl,
      source: "inbox",
    })
  } catch (error) {
    console.error("Error uploading transaction document:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
