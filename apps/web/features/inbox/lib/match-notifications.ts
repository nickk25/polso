import { prisma } from "@polso/db"
import { sendWhatsAppText, sendMatchNotification } from "@polso/agent/whatsapp"
import { sendTelegramText, sendTelegramMatchNotification } from "@polso/agent/telegram"

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MatchInboxRef {
  id: string
  waSenderId: string | null
  tgChatId: string | null
  displayName: string | null
}

export interface MatchTxRef {
  id: string
  merchantName: string | null
  name: string | null
  amount: number
  currency: string
  date: Date
}

export interface MatchScores {
  confidenceScore: number
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function notifySaved(item: MatchInboxRef): Promise<void> {
  const text =
    "📥 Tu recibo ha sido guardado. Cuando llegue la transacción del banco lo vincularemos automáticamente."
  if (item.waSenderId) await sendWhatsAppText(item.waSenderId, text)
  if (item.tgChatId) await sendTelegramText(item.tgChatId, text)
}

export async function notifyAutoMatched(item: MatchInboxRef, tx: MatchTxRef): Promise<void> {
  const text = `✅ *Recibo conciliado*\n\nTu recibo "${item.displayName ?? "sin nombre"}" ha sido vinculado automáticamente a la transacción "${tx.merchantName ?? tx.name}" de ${Math.abs(tx.amount).toFixed(2)} ${tx.currency} del ${tx.date.toLocaleDateString("es-ES")}.`
  if (item.waSenderId) await sendWhatsAppText(item.waSenderId, text)
  if (item.tgChatId) await sendTelegramText(item.tgChatId, text)
}

export async function notifySuggestedMatch(
  item: MatchInboxRef,
  tx: MatchTxRef,
  confidence: number
): Promise<void> {
  const notifParams = {
    inboxItemId: item.id,
    transactionId: tx.id,
    receiptName: item.displayName,
    transactionName: tx.merchantName ?? tx.name,
    amount: tx.amount,
    currency: tx.currency,
    date: tx.date,
    confidence,
  }
  if (item.waSenderId) {
    await sendMatchNotification({ to: item.waSenderId, ...notifParams })
  }
  if (item.tgChatId) {
    await sendTelegramMatchNotification({ chatId: item.tgChatId, ...notifParams })
  }
}

// ─── Persist match ────────────────────────────────────────────────────────────

export async function persistMatch(
  organizationId: string,
  tx: MatchTxRef,
  inboxItem: MatchInboxRef,
  scores: MatchScores,
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
      // Entry may not exist yet (sync creates it lazily) — only update if present
      prisma.entry.updateMany({
        where: { transactionId: tx.id, organizationId, status: { not: "verified" } },
        data: { status: "verified" },
      }),
    ])

    await notifyAutoMatched(inboxItem, tx)
  } else {
    await prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: "suggested_match" },
    })

    await notifySuggestedMatch(inboxItem, tx, scores.confidenceScore)
  }
}
