import { prisma } from "@polso/db"
import { findBestMatches } from "@polso/matching"
import { notifySaved, persistMatch } from "./match-notifications"

/**
 * After an InboxItem is saved, find the best matching transaction and persist the result.
 * If the item arrived via WhatsApp or Telegram, notify the sender.
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

  await persistMatch(organizationId, tx, inboxItem, best.scores, best.matchType)
}
