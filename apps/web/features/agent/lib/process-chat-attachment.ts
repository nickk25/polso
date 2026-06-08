import { createHash } from "node:crypto"
import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { prisma } from "@polso/db"
import { uploadFile } from "@polso/storage"
import { extractReceiptData, type ReceiptData } from "@polso/agent/ocr"
import { runMatchingForInboxItem } from "@/features/inbox/lib/run-inbox-matching"
import { checkAiRateLimit } from "@polso/cache/ai-rate-limit"

export interface ProcessedAttachment {
  status: "saved" | "duplicate" | "rejected" | "ocr_failed"
  inboxItemId?: string
  ocr?: ReceiptData
  fileName: string
  errorMessage?: string
}

export async function processChatAttachment(
  organizationId: string,
  buffer: Buffer,
  contentType: string,
  fileName: string,
): Promise<ProcessedAttachment> {
  const fileHash = createHash("sha256").update(buffer).digest("hex")

  // Dedup: same file already exists → re-run matching and return early
  const existing = await prisma.inboxItem.findFirst({
    where: { organizationId, fileHash },
    select: { id: true, meta: true },
  })
  if (existing) {
    after(async () => {
      await runMatchingForInboxItem(organizationId, existing.id)
    })
    return {
      status: "duplicate",
      inboxItemId: existing.id,
      ocr: existing.meta as ReceiptData | undefined,
      fileName,
    }
  }

  // OCR with Haiku — check rate limit first
  const rl = await checkAiRateLimit(organizationId, "haiku")
  if (!rl.allowed) {
    return { status: "ocr_failed", fileName, errorMessage: "Límite diario de procesamiento alcanzado. Inténtalo mañana." }
  }

  let ocrData: ReceiptData
  try {
    ocrData = await extractReceiptData(buffer, contentType)
  } catch (err) {
    return {
      status: "ocr_failed",
      fileName,
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }

  if (ocrData.documentType === "other") {
    return { status: "rejected", fileName }
  }

  // Upload to R2
  const ext = contentType.includes("pdf") ? "pdf" : (contentType.split("/")[1] ?? "jpg")
  const key = `inbox/${organizationId}/${randomUUID()}.${ext}`
  await uploadFile(key, buffer, contentType)

  // Create InboxItem
  const item = await prisma.inboxItem.create({
    data: {
      organizationId,
      fileName,
      filePath: key,
      contentType,
      size: buffer.length,
      displayName: ocrData.displayName,
      amount: ocrData.amount,
      currency: ocrData.currency ?? "EUR",
      date: ocrData.date ? new Date(ocrData.date) : null,
      cif: ocrData.cif,
      taxAmount: ocrData.vatAmount,
      taxRate: ocrData.vatRate,
      status: "processing",
      source: "chat",
      fileHash,
      meta: ocrData as object,
    },
  })

  return { status: "saved", inboxItemId: item.id, ocr: ocrData, fileName }
}
