import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import {
  getTransactionType,
  mapGoCardlessToPolsoCategory,
  selectPrimaryBalance,
  getAvailableBalance,
  GCRateLimitError,
  type BankTransaction,
} from "@polso/banking"
import { getRedis, cacheDel } from "@polso/cache"
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
  /** True when another sync for this org was already running and this one was skipped */
  skipped?: boolean
}

export interface SyncOptions {
  /** Limit the sync to these account ids (defaults to all active accounts of the org) */
  accountIds?: string[]
  /** Fetch full available history instead of the 7-day window */
  initial?: boolean
}

// A sync run is bounded by Vercel's 300s maxDuration — 10 min covers any legitimate run
const SYNC_LOCK_TTL_SECONDS = 600
// GoCardless rate limits are per-day; without a parseable retry-after, back off 6h
const RATE_LIMIT_COOLDOWN_FALLBACK_SECONDS = 6 * 60 * 60

const EMPTY_RESULT: SyncResult = {
  accountsUpdated: 0,
  transactionsImported: 0,
  transactionsModified: 0,
  entriesCreated: 0,
}

// Redis is best-effort throughout: a Redis outage degrades to unthrottled
// behavior instead of blocking bank syncs.
async function filterRateLimitedAccounts<T extends { externalAccountId: string | null }>(
  accounts: T[]
): Promise<T[]> {
  try {
    const keys = accounts.map((a) => `gc:cooldown:${a.externalAccountId}`)
    const values = await getRedis().mget<(string | null)[]>(...keys)
    return accounts.filter((_, i) => values[i] === null)
  } catch {
    return accounts
  }
}

async function setRateLimitCooldown(
  externalAccountId: string | null,
  retryAfterSeconds: number | null
): Promise<void> {
  if (!externalAccountId) return
  const ttl =
    retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds
      : RATE_LIMIT_COOLDOWN_FALLBACK_SECONDS
  try {
    await getRedis().set(`gc:cooldown:${externalAccountId}`, "1", { ex: ttl })
  } catch {
    // best-effort
  }
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
  options: SyncOptions = {}
): Promise<SyncResult> {
  // Org-level lock: cron, OAuth callback and manual sync can race — only one
  // sync per org may talk to GoCardless at a time (rate limits are per-day)
  const lockKey = `sync:lock:${organizationId}`
  let lockAcquired = false
  try {
    const acquired = await getRedis().set(lockKey, "1", { nx: true, ex: SYNC_LOCK_TTL_SECONDS })
    if (!acquired) {
      console.log(`[Sync] Org ${organizationId}: sync already in progress, skipping`)
      return { ...EMPTY_RESULT, skipped: true }
    }
    lockAcquired = true
  } catch {
    // Redis unavailable — proceed unlocked rather than blocking syncs entirely
  }

  try {
    return await runSync(organizationId, options)
  } finally {
    if (lockAcquired) {
      await cacheDel(lockKey).catch(() => {})
    }
  }
}

async function runSync(
  organizationId: string,
  { accountIds, initial = false }: SyncOptions
): Promise<SyncResult> {
  const allAccounts = await prisma.account.findMany({
    where: {
      organizationId,
      status: "active",
      requisitionId: { not: null },
      externalAccountId: { not: null },
      ...(accountIds && accountIds.length > 0 ? { id: { in: accountIds } } : {}),
    },
  })

  if (allAccounts.length === 0) {
    return { ...EMPTY_RESULT }
  }

  // Skip accounts still inside a GoCardless rate-limit cooldown (single mget)
  const accounts = await filterRateLimitedAccounts(allAccounts)
  if (accounts.length === 0) {
    console.log(`[Sync] Org ${organizationId}: all ${allAccounts.length} accounts on rate-limit cooldown`)
    return { ...EMPTY_RESULT }
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
      select: { id: true, normalizedName: true, defaultCategoryId: true, defaultEntryType: true, iban: true },
    }),
  ])

  const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))
  const counterpartyLookup: Map<string, MatchedCounterparty> = new Map(
    counterparties.map((c) => [
      c.normalizedName,
      {
        id: c.id,
        defaultCategoryId: c.defaultCategoryId,
        defaultEntryType: c.defaultEntryType,
        normalizedName: c.normalizedName,
        iban: c.iban,
      },
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

  // The consent expiry is known locally (requisitionExpiresAt), so the daily
  // requisition status check only runs near expiry or when accounts show
  // errors — saves one GoCardless call per connection per day in the healthy case
  const REQUISITION_CHECK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

  for (const [requisitionId, reqAccounts] of requisitionGroups) {
    const needsRequisitionCheck = reqAccounts.some(
      (account) =>
        !account.requisitionExpiresAt ||
        account.requisitionExpiresAt.getTime() - Date.now() < REQUISITION_CHECK_WINDOW_MS ||
        account.syncError !== null ||
        (account.syncErrorRetries ?? 0) > 0
    )

    if (needsRequisitionCheck) {
      let requisition
      try {
        requisition = await gc.getRequisition(requisitionId)
      } catch (error) {
        // Transient failure (429/5xx) — not the accounts' fault: no strikes,
        // just end any in-progress signal so SyncMonitor terminates
        console.error(`[Sync] Requisition check failed for ${requisitionId}:`, error)
        await prisma.account.updateMany({
          where: { requisitionId, organizationId, lastSyncedAt: null },
          data: { lastSyncedAt: new Date() },
        })
        continue
      }

      if (requisition === null) {
        // Confirmed 404 — the requisition no longer exists at GoCardless
        await prisma.account.updateMany({
          where: { requisitionId, organizationId },
          data: {
            status: "expired",
            syncError: "Bank connection was removed — please reconnect",
            lastSyncedAt: new Date(),
          },
        })
        continue
      }

      if (gc.isRequisitionExpired(requisition.status)) {
        await prisma.account.updateMany({
          where: { requisitionId, organizationId },
          data: { status: "expired", syncError: "Bank connection has expired — please reconnect" },
        })
        continue
      }
    }

    for (const account of reqAccounts) {
      if (!account.externalAccountId) continue

      try {
        // Balances and transactions have independent rate-limit buckets — a
        // balance failure must not block the transaction sync, and a failed
        // fetch must never overwrite the stored balance with null
        let balanceData: { balanceCurrent: number; balanceAvailable: number | null } | null = null
        try {
          const balances = await gc.getAccountBalances(account.externalAccountId)
          const primaryBalance = selectPrimaryBalance(balances, account.currency ?? undefined)
          if (primaryBalance) {
            balanceData = {
              balanceCurrent: parseFloat(primaryBalance.balanceAmount.amount),
              balanceAvailable: getAvailableBalance(balances, account.currency ?? undefined),
            }
          }
        } catch (balanceError) {
          console.warn(`[Sync] Balance fetch failed for account ${account.id}:`, balanceError)
        }

        // Update balance immediately but defer lastSyncedAt until all transactions are processed
        // so SyncMonitor can accurately track progress via lastSyncedAt: null
        await prisma.account.update({
          where: { id: account.id },
          data: { ...(balanceData ?? {}), syncError: null, syncErrorRetries: 0 },
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

        await prisma.account.update({
          where: { id: account.id },
          data: { lastSyncedAt: new Date() },
        })
      } catch (error) {
        if (error instanceof GCRateLimitError) {
          // Daily quota hit — the connection is healthy, so no strikes and no
          // disconnect. Cool the account down and let a later run retry.
          console.warn(`[Sync] Rate limited for account ${account.id}, cooling down`)
          await setRateLimitCooldown(account.externalAccountId, error.retryAfterSeconds)
          await prisma.account.update({
            where: { id: account.id },
            data: {
              syncError: "Bank API rate limit reached — will retry automatically",
              lastSyncedAt: new Date(),
            },
          })
          continue
        }

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
  const rawCounterpartyName = tx.merchantName ?? tx.name ?? null

  // Determine direction from amount sign (positive = expense, negative = income)
  const direction = tx.amount > 0 ? "expense" : "income"

  // Resolve the canonical counterparty. Returns null for generic/operation noise
  // (e.g. "Transaccion Movil") — those transactions get no counterparty. The matcher
  // owns the in-batch cache, the IBAN-first match, and the empty-key suppression.
  const matchedCounterparty: MatchedCounterparty | null = rawCounterpartyName
    ? await findOrCreateCounterparty(
        organizationId,
        rawCounterpartyName,
        direction === "expense" ? "vendor" : "client",
        {
          structured: tx.nameIsStructured,
          iban: tx.counterpartyIban,
          lookup: counterpartyLookup,
        }
      )
    : null

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
    counterpartyName: matchedCounterparty?.normalizedName ?? null,
    counterpartyIban: tx.counterpartyIban,
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
