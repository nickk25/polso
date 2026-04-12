import { prisma } from "@polso/db"
import { findBestMatches } from "@polso/matching"
import { sendWhatsAppText, sendMatchNotification } from "@polso/agent/whatsapp"
import { sendTelegramText, sendTelegramMatchNotification } from "@polso/agent/telegram"

/**
 * After a Tink sync imports new transactions, run bidirectional matching
 * against all pending InboxItems for the organization.
 *
 * Two phases (mirrors Midday's match-transactions-bidirectional pattern):
 *   Phase 1 — for each new transaction, find the best pending InboxItem
 *   Phase 2 — for remaining unmatched InboxItems, find the best new transaction
 *
 * Uses in-memory claim sets to prevent two transactions from claiming the same item.
 */
export async function matchAfterSync(
  organizationId: string,
  newTransactionIds: string[]
): Promise<void> {
  if (newTransactionIds.length === 0) return

  // Fetch new transactions (expenses only — amount > 0 means money out in Tink)
  const newTransactions = await prisma.transaction.findMany({
    where: {
      id: { in: newTransactionIds },
      amount: { gt: 0 },
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

  if (newTransactions.length === 0) return

  // Fetch all pending InboxItems for this org
  const inboxItems = await prisma.inboxItem.findMany({
    where: {
      organizationId,
      status: { in: ["new", "processing", "no_match"] },
      transactionId: null,
    },
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

  if (inboxItems.length === 0) return

  // Phase 1: for each new transaction, find the best inbox item
  const claimedInboxIds = new Set<string>()
  const claimedTransactionIds = new Set<string>()

  for (const tx of newTransactions) {
    const availableInbox = inboxItems.filter((i) => !claimedInboxIds.has(i.id))
    if (availableInbox.length === 0) break

    const candidates = availableInbox.map((item) => ({
      transactionId: tx.id,
      transactionAmount: tx.amount,
      transactionDate: tx.date,
      transactionName: tx.merchantName ?? tx.name,
      transactionCurrency: tx.currency,
      inboxItemId: item.id,
      inboxAmount: item.amount ? Number(item.amount) : null,
      inboxDate: item.date,
      inboxDisplayName: item.displayName,
      inboxCurrency: item.currency,
      inboxCif: item.cif ?? null,
    }))

    const results = findBestMatches(candidates)
    if (results.length === 0) continue

    const best = results[0]!
    const inboxItem = inboxItems.find((i) => i.id === best.inboxItemId)!

    claimedInboxIds.add(best.inboxItemId)
    claimedTransactionIds.add(tx.id)

    await persistMatch(organizationId, tx, inboxItem, best.scores, best.matchType)
  }

  // Phase 2: for remaining unmatched inbox items, try against unclaimed transactions
  const unmatchedInbox = inboxItems.filter((i) => !claimedInboxIds.has(i.id))
  const unclaimedTxs = newTransactions.filter((t) => !claimedTransactionIds.has(t.id))

  if (unmatchedInbox.length === 0 || unclaimedTxs.length === 0) return

  for (const inboxItem of unmatchedInbox) {
    const availableTxs = unclaimedTxs.filter((t) => !claimedTransactionIds.has(t.id))
    if (availableTxs.length === 0) break

    const candidates = availableTxs.map((tx) => ({
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
    if (results.length === 0) continue

    const best = results[0]!
    const tx = availableTxs.find((t) => t.id === best.transactionId)!

    claimedTransactionIds.add(best.transactionId)

    await persistMatch(organizationId, tx, inboxItem, best.scores, best.matchType)
  }
}

type TxRecord = {
  id: string
  amount: number
  date: Date
  merchantName: string | null
  name: string | null
  currency: string
}

type InboxRecord = {
  id: string
  waSenderId: string | null
  tgChatId: string | null
  displayName: string | null
}

type Scores = {
  confidenceScore: number
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
}

async function persistMatch(
  organizationId: string,
  tx: TxRecord,
  inboxItem: InboxRecord,
  scores: Scores,
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
      prisma.expense.updateMany({
        where: { transactionId: tx.id, organizationId },
        data: { status: "documented" },
      }),
    ])

    const autoText = `✅ *Recibo conciliado*\n\nTu recibo "${inboxItem.displayName ?? "sin nombre"}" ha sido vinculado a la transacción "${tx.merchantName ?? tx.name}" de ${Math.abs(tx.amount).toFixed(2)} ${tx.currency} del ${tx.date.toLocaleDateString("es-ES")}.`
    if (inboxItem.waSenderId) await sendWhatsAppText(inboxItem.waSenderId, autoText)
    if (inboxItem.tgChatId) await sendTelegramText(inboxItem.tgChatId, autoText)
  } else {
    await prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: "suggested_match" },
    })

    const notifParams = {
      inboxItemId: inboxItem.id,
      transactionId: tx.id,
      receiptName: inboxItem.displayName,
      transactionName: tx.merchantName ?? tx.name,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      confidence: scores.confidenceScore,
    }
    if (inboxItem.waSenderId) {
      await sendMatchNotification({ to: inboxItem.waSenderId, ...notifParams })
    }
    if (inboxItem.tgChatId) {
      await sendTelegramMatchNotification({ chatId: inboxItem.tgChatId, ...notifParams })
    }
  }
}
