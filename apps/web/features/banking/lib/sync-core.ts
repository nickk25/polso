import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import {
  normalizeCounterpartyName,
  getTransactionType,
  mapGoCardlessToPolsoCategory,
  selectPrimaryBalance,
  type BankTransaction,
} from "@polso/banking"
import { suggestCategory } from "@polso/intelligence"
import { findOrCreateCounterparty, type MatchedCounterparty } from "@/features/counterparties/lib/counterparty-matcher"
import { matchAfterSync } from "@/features/inbox/lib/match-after-sync"
import { backfillCategoriesCore } from "@/features/transactions/lib/backfill-core"
import { getGoCardlessClient } from "./gocardless-client"

export interface SyncResult {
  accountsUpdated: number
  transactionsImported: number
  transactionsModified: number
  entriesCreated: number
}

type MerchantHistory = Map<string, { categories: Map<string, number>; entryTypes: Map<string, number> }>

function mostFrequentInMap(map: Map<string, number>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of map) {
    if (count > bestCount) { best = key; bestCount = count }
  }
  return best
}

export async function syncTransactionsCore(
  organizationId: string,
  accountId?: string,
  initial = false
): Promise<SyncResult> {
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      status: "active",
      requisitionId: { not: null },
      externalAccountId: { not: null },
      ...(accountId ? { id: accountId } : {}),
    },
  })

  if (accounts.length === 0) {
    return { accountsUpdated: 0, transactionsImported: 0, transactionsModified: 0, entriesCreated: 0 }
  }

  const requisitionGroups = new Map<string, typeof accounts>()
  for (const account of accounts) {
    if (!account.requisitionId) continue
    const group = requisitionGroups.get(account.requisitionId) ?? []
    group.push(account)
    requisitionGroups.set(account.requisitionId, group)
  }

  const [categories, counterparties] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { organizationId }] },
      select: { id: true, slug: true },
    }),
    prisma.counterparty.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true, defaultEntryType: true },
    }),
  ])

  const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))
  const counterpartyLookup = new Map(
    counterparties.map((c) => [
      c.normalizedName,
      { id: c.id, defaultCategoryId: c.defaultCategoryId, defaultEntryType: c.defaultEntryType },
    ])
  )

  // Build merchant history from existing entries for intelligent categorization
  const historicalEntries = await prisma.entry.findMany({
    where: { organizationId, categoryId: { not: null } },
    select: {
      categoryId: true,
      entryType: true,
      transaction: { select: { merchantName: true } },
    },
  })

  const merchantHistory: MerchantHistory = new Map()
  for (const e of historicalEntries) {
    const key = e.transaction?.merchantName?.toLowerCase().trim()
    if (!key || !e.categoryId) continue
    if (!merchantHistory.has(key)) {
      merchantHistory.set(key, { categories: new Map(), entryTypes: new Map() })
    }
    const h = merchantHistory.get(key)!
    h.categories.set(e.categoryId, (h.categories.get(e.categoryId) ?? 0) + 1)
    h.entryTypes.set(e.entryType, (h.entryTypes.get(e.entryType) ?? 0) + 1)
  }

  const gc = getGoCardlessClient()

  let totalTransactionsImported = 0
  let totalTransactionsModified = 0
  let totalEntriesCreated = 0
  let accountsUpdated = 0
  const newTransactionIds: string[] = []

  for (const [requisitionId, reqAccounts] of requisitionGroups) {
    const requisition = await gc.getRequisition(requisitionId)
    if (requisition && gc.isRequisitionExpired(requisition.status)) {
      await prisma.account.updateMany({
        where: { requisitionId, organizationId },
        data: { status: "expired", syncError: "Bank connection has expired — please reconnect" },
      })
      continue
    }

    for (const account of reqAccounts) {
      if (!account.externalAccountId) continue

      try {
        const balances = await gc.getAccountBalances(account.externalAccountId)
        const primaryBalance = selectPrimaryBalance(balances, account.currency ?? undefined)
        const balanceCurrent = primaryBalance
          ? parseFloat(primaryBalance.balanceAmount.amount)
          : null

        await prisma.account.update({
          where: { id: account.id },
          data: { balanceCurrent, lastSyncedAt: new Date(), syncError: null, syncErrorRetries: 0 },
        })
        accountsUpdated++

        const transactions = await gc.getTransactions(account.externalAccountId, !initial)

        for (const tx of transactions) {
          const { imported, modified, entryCreated, transactionId } =
            await upsertTransaction(
              organizationId,
              account.id,
              tx,
              categoryLookup,
              counterpartyLookup,
              merchantHistory
            )

          if (imported) { totalTransactionsImported++; newTransactionIds.push(transactionId) }
          if (modified) totalTransactionsModified++
          if (entryCreated) totalEntriesCreated++
        }
      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error)
        const retries = (account.syncErrorRetries ?? 0) + 1
        await prisma.account.update({
          where: { id: account.id },
          data: {
            syncError: error instanceof Error ? error.message : "Sync failed",
            syncErrorRetries: retries,
            lastSyncedAt: new Date(),
            ...(retries >= 3 ? { status: "disconnected" } : {}),
          },
        })
      }
    }
  }

  if (newTransactionIds.length > 0) {
    await matchAfterSync(organizationId, newTransactionIds).catch((err) =>
      console.error("matchAfterSync error:", err)
    )
  }

  await backfillCategoriesCore(organizationId).catch((err) =>
    console.error("backfillCategories error:", err)
  )

  return {
    accountsUpdated,
    transactionsImported: totalTransactionsImported,
    transactionsModified: totalTransactionsModified,
    entriesCreated: totalEntriesCreated,
  }
}

async function upsertTransaction(
  organizationId: string,
  accountId: string,
  tx: BankTransaction,
  categoryLookup: Map<string, string>,
  counterpartyLookup: Map<string, MatchedCounterparty>,
  merchantHistory: MerchantHistory = new Map()
): Promise<{ imported: boolean; modified: boolean; entryCreated: boolean; transactionId: string }> {
  const counterpartyName = tx.merchantName ?? tx.name ?? null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Determine direction from amount sign (positive = expense, negative = income)
  const direction = tx.amount > 0 ? "expense" : "income"

  // Find/create counterparty
  let matchedCounterparty: MatchedCounterparty | null = normalizedCounterparty
    ? (counterpartyLookup.get(normalizedCounterparty) ?? null)
    : null

  if (!matchedCounterparty && normalizedCounterparty && counterpartyName) {
    const cp = await findOrCreateCounterparty(
      organizationId,
      counterpartyName,
      direction === "expense" ? "vendor" : "client",
      counterpartyLookup
    )
    matchedCounterparty = cp
    counterpartyLookup.set(normalizedCounterparty, cp)
  }

  // Upsert the raw Transaction record
  const existing = await prisma.transaction.findFirst({
    where: { accountId, externalTransactionId: tx.externalTransactionId },
    select: { id: true },
  })

  const txData = {
    accountId,
    amount: tx.amount,
    currency: tx.currency,
    date: tx.date,
    authorizedDate: tx.authorizedDate,
    name: tx.name,
    merchantName: tx.merchantName,
    pending: tx.pending,
    paymentChannel: tx.paymentChannel,
    transactionType: getTransactionType(tx.amount),
    category: tx.category,
    categoryDetailed: tx.categoryDetailed,
    counterpartyName: normalizedCounterparty,
  }

  let transaction: { id: string }
  let imported = false
  let modified = false

  if (existing) {
    await prisma.transaction.update({ where: { id: existing.id }, data: txData })
    transaction = existing
    modified = true
  } else {
    transaction = await prisma.transaction.create({
      data: { organizationId, externalTransactionId: tx.externalTransactionId, ...txData },
      select: { id: true },
    })
    imported = true
  }

  let entryCreated = false

  const existingEntry = await prisma.entry.findUnique({
    where: { transactionId: transaction.id },
    select: { id: true },
  })

  if (!existingEntry) {
    // Build category suggestion for expenses
    let categoryId: string | null = null
    let categorySource: string | null = null
    let categoryConfidence: number | null = null
    let entryType = "variable"

    if (direction === "expense") {
      const merchantKey = tx.merchantName?.toLowerCase().trim() ?? null
      const history = merchantKey ? merchantHistory.get(merchantKey) : null
      const historicalCategoryId = history ? mostFrequentInMap(history.categories) : null
      const historicalTxCount = history
        ? [...history.entryTypes.values()].reduce((a, b) => a + b, 0)
        : 0
      const historicalEntryType =
        history && historicalTxCount >= 2 ? mostFrequentInMap(history.entryTypes) : null

      if (historicalEntryType) entryType = historicalEntryType
      if (matchedCounterparty?.defaultEntryType) entryType = matchedCounterparty.defaultEntryType

      const gcCategory = mapGoCardlessToPolsoCategory(tx.categoryDetailed, tx.category)
      const suggestion = suggestCategory(
        {
          vendorDefaultCategoryId: matchedCounterparty?.defaultCategoryId,
          historicalCategoryId,
          providerPrimaryCategory: gcCategory?.slug ?? tx.category,
          providerDetailedCategory: tx.categoryDetailed,
          merchantName: tx.merchantName,
          transactionName: tx.name,
        },
        categoryLookup
      )

      if (suggestion) {
        categoryId = suggestion.categoryId
        categorySource = suggestion.source
        categoryConfidence = suggestion.confidence
      }
    } else {
      // Income: use counterparty default category if available
      categoryId = matchedCounterparty?.defaultCategoryId ?? null
      if (categoryId) categorySource = "counterparty"
    }

    try {
      await prisma.entry.create({
        data: {
          organizationId,
          transactionId: transaction.id,
          direction,
          amount: Math.abs(tx.amount),
          currency: tx.currency,
          date: tx.date,
          description: tx.merchantName ?? tx.name,
          entryType,
          status: "pending",
          isManual: false,
          counterpartyId: matchedCounterparty?.id ?? null,
          categoryId,
          categorySource,
          categoryConfidence,
        },
      })
      entryCreated = true
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error
      }
    }
  } else if (modified) {
    // Update entry amount/date/description when the raw transaction changes
    await prisma.entry.update({
      where: { transactionId: transaction.id },
      data: {
        amount: Math.abs(tx.amount),
        currency: tx.currency,
        date: tx.date,
        description: tx.merchantName ?? tx.name,
      },
    })
  }

  return { imported, modified, entryCreated, transactionId: transaction.id }
}
