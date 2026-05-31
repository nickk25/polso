import { prisma } from "@polso/db"
import { findBestMatches } from "@polso/matching"
import { persistMatch } from "./match-notifications"

/**
 * After a GoCardless sync imports new transactions, run bidirectional matching
 * against all pending InboxItems for the organization.
 *
 * Two phases:
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

  // Fetch new transactions (expenses only — amount > 0 means money out)
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
      status: { in: ["processing", "no_match"] },
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
    const best = results[0]
    if (!best) continue

    const inboxItem = inboxItems.find((i) => i.id === best.inboxItemId)
    if (!inboxItem) continue

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
    const best = results[0]
    if (!best) continue

    const tx = availableTxs.find((t) => t.id === best.transactionId)
    if (!tx) continue

    claimedTransactionIds.add(best.transactionId)

    await persistMatch(organizationId, tx, inboxItem, best.scores, best.matchType)
  }
}
