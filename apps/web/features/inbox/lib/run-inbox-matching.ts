import { prisma } from "@polso/db"
import { findBestMatches } from "@polso/matching"
import { sendWhatsAppText, sendMatchNotification } from "@polso/agent/whatsapp"
import { sendTelegramText, sendTelegramMatchNotification } from "@polso/agent/telegram"

/**
 * After an InboxItem is saved, find the best matching transaction and persist the result.
 * If the item arrived via WhatsApp, notify the sender.
 *
 * Looks back 90 days. Only considers expense transactions (amount > 0).
 * Skips transactions already linked via TransactionAttachment.
 */
export async function runMatchingForInboxItem(
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

  if (transactions.length === 0) {
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    })
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
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "no_match" },
    })
    await notifySaved(inboxItem)
    return
  }

  const best = results[0]!
  const tx = transactions.find((t) => t.id === best.transactionId)!

  // Persist — upsert to avoid race conditions with duplicate syncs
  await prisma.matchSuggestion.upsert({
    where: { transactionId_inboxItemId: { transactionId: best.transactionId, inboxItemId } },
    update: {},
    create: {
      organizationId,
      transactionId: best.transactionId,
      inboxItemId,
      confidenceScore: best.scores.confidenceScore,
      amountScore: best.scores.amountScore,
      dateScore: best.scores.dateScore,
      nameScore: best.scores.nameScore,
      currencyScore: best.scores.currencyScore,
      matchType: best.matchType,
      status: best.matchType === "auto_matched" ? "confirmed" : "pending",
    },
  })

  if (best.matchType === "auto_matched") {
    await Promise.all([
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId: best.transactionId, inboxItemId } },
        update: {},
        create: { transactionId: best.transactionId, inboxItemId },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId: best.transactionId },
      }),
      prisma.expense.updateMany({
        where: { transactionId: best.transactionId, organizationId },
        data: { status: "documented" },
      }),
    ])

    await notifyAutoMatched(inboxItem, tx)
  } else {
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "suggested_match" },
    })

    await notifySuggestedMatch(inboxItem, tx, best.transactionId, best.scores.confidenceScore)
  }
}

// ─── Channel-agnostic notification helpers ───────────────────────────────────

type InboxRef = {
  waSenderId: string | null
  tgChatId: string | null
  displayName: string | null
}

type TxRef = {
  merchantName: string | null
  name: string | null
  amount: number
  currency: string
  date: Date
}

async function notifySaved(item: InboxRef): Promise<void> {
  const text =
    "📥 Tu recibo ha sido guardado. Cuando llegue la transacción del banco lo vincularemos automáticamente."
  if (item.waSenderId) await sendWhatsAppText(item.waSenderId, text)
  if (item.tgChatId) await sendTelegramText(item.tgChatId, text)
}

async function notifyAutoMatched(item: InboxRef, tx: TxRef): Promise<void> {
  const text = `✅ *Recibo conciliado*\n\nTu recibo ha sido vinculado automáticamente a la transacción "${tx.merchantName ?? tx.name}" de ${Math.abs(tx.amount).toFixed(2)} ${tx.currency} del ${tx.date.toLocaleDateString("es-ES")}.`
  if (item.waSenderId) await sendWhatsAppText(item.waSenderId, text)
  if (item.tgChatId) await sendTelegramText(item.tgChatId, text)
}

async function notifySuggestedMatch(
  item: InboxRef & { id: string },
  tx: TxRef,
  transactionId: string,
  confidence: number
): Promise<void> {
  if (item.waSenderId) {
    await sendMatchNotification({
      to: item.waSenderId,
      inboxItemId: item.id,
      transactionId,
      receiptName: item.displayName,
      transactionName: tx.merchantName ?? tx.name,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      confidence,
    })
  }
  if (item.tgChatId) {
    await sendTelegramMatchNotification({
      chatId: item.tgChatId,
      inboxItemId: item.id,
      transactionId,
      receiptName: item.displayName,
      transactionName: tx.merchantName ?? tx.name,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      confidence,
    })
  }
}
