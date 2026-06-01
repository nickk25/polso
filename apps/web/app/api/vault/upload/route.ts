import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/storage/r2"
import { randomUUID } from "crypto"
import { extractReceiptData } from "@polso/agent/ocr"
import { runMatchingForInboxItem } from "@/features/inbox/lib/run-inbox-matching"
import { revalidatePath } from "next/cache"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

async function processVaultFile(
  organizationId: string,
  inboxItemId: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  try {
    const ocrData = await extractReceiptData(buffer, contentType)

    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: {
        displayName: ocrData.displayName,
        amount: ocrData.amount,
        currency: ocrData.currency ?? "EUR",
        date: ocrData.date ? new Date(ocrData.date) : null,
        cif: ocrData.cif,
        taxAmount: ocrData.vatAmount,
        taxRate: ocrData.vatRate,
        meta: ocrData as object,
      },
    })

    await runMatchingForInboxItem(organizationId, inboxItemId)
    revalidatePath("/vault")
  } catch (err) {
    console.error("[vault/upload] processVaultFile error:", err)
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    }).catch(() => {})
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext()
    const formData = await request.formData()
    const files = formData.getAll("file") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Validate all files before touching storage
    for (const file of files) {
      if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 })
      }
      if (file.size > UPLOAD_MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 })
      }
    }

    // Read all buffers first (can't re-read File streams)
    const buffers = await Promise.all(files.map((f) => f.arrayBuffer().then(Buffer.from)))

    // Upload to R2 and create InboxItems in parallel
    const items = await Promise.all(
      files.map(async (file, i) => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
        const key = `inbox/${organizationId}/${randomUUID()}.${ext}`
        const buffer = buffers[i]!

        await uploadFile(key, buffer, file.type)

        const inboxItem = await prisma.inboxItem.create({
          data: {
            organizationId,
            fileName: file.name,
            filePath: key,
            contentType: file.type,
            size: file.size,
            status: "processing",
            source: "upload",
          },
        })

        return { inboxItem, buffer, contentType: file.type }
      })
    )

    // Schedule background OCR for each file
    for (const { inboxItem, buffer, contentType } of items) {
      after(processVaultFile(organizationId, inboxItem.id, buffer, contentType))
    }

    return NextResponse.json({
      uploaded: items.length,
      files: items.map(({ inboxItem }) => ({ id: inboxItem.id, fileName: inboxItem.fileName })),
    })
  } catch (error) {
    console.error("Error uploading vault documents:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
