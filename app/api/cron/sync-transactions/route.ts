import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  syncTransactions,
  getBalances,
  normalizeCounterpartyName,
  getTransactionType,
  type PlaidTransaction,
} from "@/features/banking/lib/plaid-client"

const CRON_SECRET = process.env.CRON_SECRET
const STALE_THRESHOLD_HOURS = 1 // Sync accounts not updated in the last hour

/**
 * Background sync job for all accounts
 * Called by cron scheduler (Vercel Cron, external scheduler, etc.)
 *
 * Security: Requires CRON_SECRET header or query parameter
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization")
  const secretParam = request.nextUrl.searchParams.get("secret")

  const providedSecret = authHeader?.replace("Bearer ", "") || secretParam

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncAllAccounts()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Cron sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

interface SyncResult {
  accountsSynced: number
  accountsFailed: number
  transactionsImported: number
  transactionsModified: number
  transactionsRemoved: number
  expensesCreated: number
  duration: number
}

async function syncAllAccounts(): Promise<SyncResult> {
  const startTime = Date.now()

  // Find all accounts that need syncing (not synced in last STALE_THRESHOLD_HOURS)
  const staleDate = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)

  const accounts = await prisma.account.findMany({
    where: {
      status: "active",
      plaidAccessToken: { not: null },
      OR: [
        { lastSyncedAt: null },
        { lastSyncedAt: { lt: staleDate } },
      ],
    },
    include: {
      organization: {
        select: { id: true, name: true },
      },
    },
  })

  if (accounts.length === 0) {
    return {
      accountsSynced: 0,
      accountsFailed: 0,
      transactionsImported: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
      expensesCreated: 0,
      duration: Date.now() - startTime,
    }
  }

  console.log(`[Cron] Syncing ${accounts.length} stale accounts`)

  // Group by Plaid Item ID to avoid duplicate API calls
  const itemGroups = new Map<string, typeof accounts>()
  for (const account of accounts) {
    if (!account.plaidItemId) continue
    const group = itemGroups.get(account.plaidItemId) || []
    group.push(account)
    itemGroups.set(account.plaidItemId, group)
  }

  let accountsSynced = 0
  let accountsFailed = 0
  let totalTransactionsImported = 0
  let totalTransactionsModified = 0
  let totalTransactionsRemoved = 0
  let totalExpensesCreated = 0

  // Process each Item (bank connection)
  for (const [itemId, itemAccounts] of itemGroups) {
    const accessToken = itemAccounts[0].plaidAccessToken
    if (!accessToken) continue

    const cursor = itemAccounts[0].plaidCursor
    const organizationId = itemAccounts[0].organizationId

    try {
      console.log(`[Cron] Syncing Item ${itemId} for org ${itemAccounts[0].organization.name}`)

      // Get balances
      const balancesResponse = await getBalances(accessToken)

      // Update balances for each account
      for (const account of itemAccounts) {
        const balance = balancesResponse.accounts.find(
          (b) => b.account_id === account.plaidAccountId
        )

        if (balance) {
          await prisma.account.update({
            where: { id: account.id },
            data: {
              balanceAvailable: balance.balances.available,
              balanceCurrent: balance.balances.current,
              balanceLimit: balance.balances.limit,
              lastSyncedAt: new Date(),
              syncError: null,
            },
          })
          accountsSynced++
        }
      }

      // Sync transactions
      const syncResult = await syncTransactions(accessToken, cursor)

      // Process added transactions
      for (const tx of syncResult.added) {
        const account = itemAccounts.find(
          (a) => a.plaidAccountId === tx.account_id
        )
        if (!account) continue

        const result = await importTransaction(organizationId, account.id, tx)
        totalTransactionsImported++
        if (result.expenseCreated) {
          totalExpensesCreated++
        }
      }

      // Process modified transactions
      for (const tx of syncResult.modified) {
        const account = itemAccounts.find(
          (a) => a.plaidAccountId === tx.account_id
        )
        if (!account) continue

        await updateTransaction(account.id, tx)
        totalTransactionsModified++
      }

      // Process removed transactions
      for (const removed of syncResult.removed) {
        await prisma.transaction.deleteMany({
          where: {
            plaidTransactionId: removed.transaction_id,
          },
        })
        totalTransactionsRemoved++
      }

      // Update cursor for all accounts in this Item
      await prisma.account.updateMany({
        where: {
          plaidItemId: itemId,
        },
        data: {
          plaidCursor: syncResult.nextCursor,
        },
      })

      console.log(`[Cron] Item ${itemId} synced: +${syncResult.added.length} transactions`)
    } catch (error) {
      console.error(`[Cron] Error syncing Item ${itemId}:`, error)
      accountsFailed += itemAccounts.length

      // Update accounts with error
      await prisma.account.updateMany({
        where: {
          plaidItemId: itemId,
        },
        data: {
          syncError: error instanceof Error ? error.message : "Sync failed",
          lastSyncedAt: new Date(),
        },
      })
    }
  }

  const duration = Date.now() - startTime
  console.log(`[Cron] Sync complete in ${duration}ms: ${accountsSynced} accounts, ${totalTransactionsImported} new transactions`)

  return {
    accountsSynced,
    accountsFailed,
    transactionsImported: totalTransactionsImported,
    transactionsModified: totalTransactionsModified,
    transactionsRemoved: totalTransactionsRemoved,
    expensesCreated: totalExpensesCreated,
    duration,
  }
}

async function importTransaction(
  organizationId: string,
  accountId: string,
  tx: PlaidTransaction
): Promise<{ expenseCreated: boolean }> {
  // Check if transaction already exists
  const existing = await prisma.transaction.findFirst({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    select: { id: true },
  })

  if (existing) {
    return { expenseCreated: false }
  }

  // Determine counterparty name
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      organizationId,
      accountId,
      plaidTransactionId: tx.transaction_id,
      amount: tx.amount,
      currency: tx.iso_currency_code || "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel,
      transactionType: getTransactionType(tx.amount),
      category: tx.personal_finance_category?.primary || null,
      categoryDetailed: tx.personal_finance_category?.detailed || null,
      counterpartyName: normalizedCounterparty,
    },
  })

  // Create expense for outgoing transactions (positive amounts = money out)
  let expenseCreated = false
  if (tx.amount > 0 && !tx.pending) {
    await prisma.expense.create({
      data: {
        organizationId,
        transactionId: transaction.id,
        amount: tx.amount,
        currency: tx.iso_currency_code || "USD",
        date: new Date(tx.date),
        description: tx.merchant_name || tx.name,
        expenseType: "variable",
        status: "pending",
        isManual: false,
      },
    })
    expenseCreated = true
  }

  return { expenseCreated }
}

async function updateTransaction(
  accountId: string,
  tx: PlaidTransaction
): Promise<void> {
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  await prisma.transaction.updateMany({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    data: {
      amount: tx.amount,
      currency: tx.iso_currency_code || "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel,
      transactionType: getTransactionType(tx.amount),
      category: tx.personal_finance_category?.primary || null,
      categoryDetailed: tx.personal_finance_category?.detailed || null,
      counterpartyName: normalizedCounterparty,
    },
  })

  // Update associated expense if exists
  const transaction = await prisma.transaction.findFirst({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    include: { expense: true },
  })

  if (transaction?.expense) {
    await prisma.expense.update({
      where: { id: transaction.expense.id },
      data: {
        amount: Math.abs(tx.amount),
        currency: tx.iso_currency_code || "USD",
        date: new Date(tx.date),
        description: tx.merchant_name || tx.name,
      },
    })
  }
}
