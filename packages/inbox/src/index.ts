import { prisma } from "@polso/db"
import { extractReceiptData } from "@polso/agent/ocr"
import { sendWhatsAppText, sendMatchNotification } from "@polso/agent/whatsapp"
import { sendTelegramText, sendTelegramMatchNotification } from "@polso/agent/telegram"
import { findBestMatches } from "@polso/matching"

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface TxForMatch {
  id: string
  merchantName: string | null
  name: string | null
  amount: number
  currency: string
  date: Date
}

export interface InboxItemForMatch {
  id: string
  displayName: string | null
  waSenderId?: string | null
  tgChatId?: string | null
  /** Plain number — convert from Prisma Decimal with Number() before passing */
  taxAmount?: number | null
  taxRate?: number | null
}

export interface MatchScoresResult {
  confidenceScore: number
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
}

// ─── Canonical match persistence (DB + optional notifications) ────────────────

/**
 * Persist a confirmed or suggested match to the database.
 * If the inboxItem has waSenderId/tgChatId, also notifies the user.
 * Propagates taxAmount/taxRate from the receipt to the Entry when auto-matching.
 */
export async function persistMatchResult(
  organizationId: string,
  tx: TxForMatch,
  inboxItem: InboxItemForMatch,
  scores: MatchScoresResult,
  matchType: "auto_matched" | "high_confidence" | "suggested"
): Promise<void> {
  const isAuto = matchType === "auto_matched"

  await prisma.matchSuggestion.upsert({
    where: { transactionId_inboxItemId: { transactionId: tx.id, inboxItemId: inboxItem.id } },
    update: {},
    create: {
      organizationId,
      transactionId: tx.id,
      inboxItemId: inboxItem.id,
      confidenceScore: scores.confidenceScore,
      amountScore: scores.amountScore,
      dateScore: scores.dateScore,
      nameScore: scores.nameScore,
      currencyScore: scores.currencyScore,
      matchType,
      status: isAuto ? "confirmed" : "pending",
    },
  })

  if (isAuto) {
    const existingEntry = await prisma.entry.findFirst({
      where: { transactionId: tx.id, organizationId },
      select: { taxAmount: true, taxRate: true },
    })

    const taxData: { taxAmount?: number; taxRate?: number } = {}
    if (inboxItem.taxAmount != null && existingEntry?.taxAmount == null) {
      taxData.taxAmount = inboxItem.taxAmount
    }
    if (inboxItem.taxRate != null && existingEntry?.taxRate == null) {
      taxData.taxRate = inboxItem.taxRate
    }

    await Promise.all([
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId: tx.id, inboxItemId: inboxItem.id } },
        update: {},
        create: { transactionId: tx.id, inboxItemId: inboxItem.id },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItem.id },
        data: { status: "done", transactionId: tx.id },
      }),
      prisma.entry.updateMany({
        where: { transactionId: tx.id, organizationId, status: { not: "verified" } },
        data: { status: "verified", ...taxData },
      }),
    ])

    if (inboxItem.waSenderId || inboxItem.tgChatId) {
      const text = `✅ *Recibo conciliado*\n\nTu recibo "${inboxItem.displayName ?? "sin nombre"}" ha sido vinculado automáticamente a la transacción "${tx.merchantName ?? tx.name}" de ${Math.abs(tx.amount).toFixed(2)} ${tx.currency} del ${tx.date.toLocaleDateString("es-ES")}.`
      if (inboxItem.waSenderId) await sendWhatsAppText(inboxItem.waSenderId, text)
      if (inboxItem.tgChatId) await sendTelegramText(inboxItem.tgChatId, text)
    }
  } else {
    await prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: "suggested_match" },
    })

    if (inboxItem.waSenderId || inboxItem.tgChatId) {
      const params = {
        inboxItemId: inboxItem.id,
        transactionId: tx.id,
        receiptName: inboxItem.displayName,
        transactionName: tx.merchantName ?? tx.name,
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
        confidence: scores.confidenceScore,
      }
      if (inboxItem.waSenderId) await sendMatchNotification({ to: inboxItem.waSenderId, ...params })
      if (inboxItem.tgChatId) await sendTelegramMatchNotification({ chatId: inboxItem.tgChatId, ...params })
    }
  }
}

// ─── Manual confirm path (user presses ✅ button) ────────────────────────────

/**
 * Confirm a pending MatchSuggestion after user approval.
 * Verifies org ownership, propagates IVA, and runs the DB transaction.
 * Returns false if the suggestion is not found (safe to ignore stale callbacks).
 */
export async function confirmMatchInDb(
  organizationId: string,
  inboxItemId: string,
  transactionId: string
): Promise<boolean> {
  const suggestion = await prisma.matchSuggestion.findFirst({
    where: { organizationId, inboxItemId, transactionId },
    select: { id: true },
  })
  if (!suggestion) return false

  const [inboxItemTax, existingEntry] = await Promise.all([
    prisma.inboxItem.findUnique({ where: { id: inboxItemId }, select: { taxAmount: true, taxRate: true } }),
    prisma.entry.findFirst({ where: { transactionId, organizationId }, select: { taxAmount: true, taxRate: true } }),
  ])

  const taxData: { taxAmount?: number; taxRate?: number } = {}
  if (inboxItemTax?.taxAmount != null && existingEntry?.taxAmount == null) {
    taxData.taxAmount = Number(inboxItemTax.taxAmount)
  }
  if (inboxItemTax?.taxRate != null && existingEntry?.taxRate == null) {
    taxData.taxRate = inboxItemTax.taxRate
  }

  await prisma.$transaction([
    prisma.transactionAttachment.upsert({
      where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
      update: {},
      create: { transactionId, inboxItemId },
    }),
    prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "done", transactionId },
    }),
    prisma.matchSuggestion.updateMany({
      where: { inboxItemId, transactionId },
      data: { status: "confirmed", userActionAt: new Date() },
    }),
    prisma.entry.updateMany({
      where: { transactionId, organizationId, status: { not: "verified" } },
      data: { status: "verified", ...taxData },
    }),
  ])

  return true
}

// ─── Canonical single-item matching pipeline ──────────────────────────────────

/**
 * Find the best matching transaction for a single InboxItem and persist the result.
 * Sends WhatsApp/Telegram notifications if the item has a chatId/senderId.
 */
export async function runMatchingForItem(
  organizationId: string,
  inboxItemId: string
): Promise<void> {
  const inboxItem = await prisma.inboxItem.findUnique({
    where: { id: inboxItemId },
    select: {
      id: true,
      amount: true,
      date: true,
      displayName: true,
      currency: true,
      cif: true,
      waSenderId: true,
      tgChatId: true,
      taxAmount: true,
      taxRate: true,
    },
  })

  if (!inboxItem) return

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId,
      amount: { gt: 0 },
      date: { gte: since },
      transactionAttachments: { none: {} },
    },
    select: {
      id: true,
      amount: true,
      date: true,
      merchantName: true,
      name: true,
      currency: true,
    },
  })

  const noMatchNotify = async () => {
    if (inboxItem.waSenderId || inboxItem.tgChatId) {
      const text =
        "📥 Tu recibo ha sido guardado. Cuando llegue la transacción del banco lo vincularemos automáticamente."
      if (inboxItem.waSenderId) await sendWhatsAppText(inboxItem.waSenderId, text)
      if (inboxItem.tgChatId) await sendTelegramText(inboxItem.tgChatId, text)
    }
  }

  if (transactions.length === 0) {
    await prisma.inboxItem.update({ where: { id: inboxItemId }, data: { status: "no_match" } })
    await noMatchNotify()
    return
  }

  const candidates = transactions.map((tx) => ({
    transactionId: tx.id,
    transactionAmount: tx.amount,
    transactionDate: tx.date,
    transactionName: tx.merchantName ?? tx.name,
    transactionCurrency: tx.currency,
    inboxItemId: inboxItem.id,
    inboxAmount: inboxItem.amount ? Number(inboxItem.amount) : null,
    inboxDate: inboxItem.date,
    inboxDisplayName: inboxItem.displayName,
    inboxCurrency: inboxItem.currency,
    inboxCif: inboxItem.cif ?? null,
  }))

  const results = findBestMatches(candidates)

  if (results.length === 0) {
    await prisma.inboxItem.update({ where: { id: inboxItemId }, data: { status: "no_match" } })
    await noMatchNotify()
    return
  }

  const best = results[0]!
  const tx = transactions.find((t) => t.id === best.transactionId)!

  await persistMatchResult(
    organizationId,
    tx,
    {
      id: inboxItem.id,
      displayName: inboxItem.displayName,
      waSenderId: inboxItem.waSenderId,
      tgChatId: inboxItem.tgChatId,
      taxAmount: inboxItem.taxAmount != null ? Number(inboxItem.taxAmount) : null,
      taxRate: inboxItem.taxRate,
    },
    best.scores,
    best.matchType
  )
}

// ─── OCR + matching pipeline for upload flows ─────────────────────────────────

/**
 * Run OCR on a newly uploaded file, update the InboxItem with extracted data,
 * then run matching. Used by vault uploads (web) and partner uploads.
 */
export async function processInboxItem(
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

    await runMatchingForItem(organizationId, inboxItemId)
  } catch (err) {
    console.error("[processInboxItem] error:", err)
    await prisma.inboxItem
      .update({ where: { id: inboxItemId }, data: { status: "no_match" } })
      .catch(() => {})
  }
}
