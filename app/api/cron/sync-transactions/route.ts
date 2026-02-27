import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db"
import {
  syncTransactions,
  getBalances,
  updateItemWebhook,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
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
  incomesCreated: number
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
      incomesCreated: 0,
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
  let totalIncomesCreated = 0

  // Process each Item (bank connection)
  for (const [itemId, itemAccounts] of itemGroups) {
    const accessToken = itemAccounts[0].plaidAccessToken
    if (!accessToken) continue

    const cursor = itemAccounts[0].plaidCursor
    const organizationId = itemAccounts[0].organizationId

    try {
      console.log(`[Cron] Syncing Item ${itemId} for org ${itemAccounts[0].organization.name}`)

      // Ensure webhook URL is registered (migrates existing items + keeps URL current)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      if (appUrl) {
        await updateItemWebhook(accessToken, `${appUrl}/api/webhooks/plaid`).catch(
          (err) => console.warn(`[Cron] Failed to update webhook for item ${itemId}:`, err)
        )
      }

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
        if (result.incomeCreated) {
          totalIncomesCreated++
        }
      }

      // Process modified transactions
      for (const tx of syncResult.modified) {
        const account = itemAccounts.find(
          (a) => a.plaidAccountId === tx.account_id
        )
        if (!account) continue

        const updateResult = await updateTransaction(organizationId, account.id, tx)
        totalTransactionsModified++
        if (updateResult.expenseCreated) totalExpensesCreated++
        if (updateResult.incomeCreated) totalIncomesCreated++
      }

      // Process removed transactions (cancelled by bank)
      for (const removed of syncResult.removed) {
        const tx = await prisma.transaction.findFirst({
          where: { plaidTransactionId: removed.transaction_id },
          select: { id: true },
        })

        if (tx) {
          await prisma.expense.deleteMany({ where: { transactionId: tx.id } })
          await prisma.income.deleteMany({ where: { transactionId: tx.id } })
          await prisma.transaction.delete({ where: { id: tx.id } })
        }

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
    incomesCreated: totalIncomesCreated,
    duration,
  }
}

async function importTransaction(
  organizationId: string,
  accountId: string,
  tx: PlaidTransaction
): Promise<{ expenseCreated: boolean; incomeCreated: boolean }> {
  // Determine counterparty name
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Upsert transaction - handles duplicates gracefully
  const transaction = await prisma.transaction.upsert({
    where: {
      accountId_plaidTransactionId: {
        accountId,
        plaidTransactionId: tx.transaction_id,
      },
    },
    update: {
      // Update mutable fields for existing transactions
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
    create: {
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

  let expenseCreated = false
  let incomeCreated = false

  // Create expense for outgoing transactions (positive amounts = money out)
  if (tx.amount > 0) {
    const existingExpense = await prisma.expense.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })

    if (!existingExpense) {
      try {
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
      } catch (error) {
        // Handle race condition - expense was created by concurrent sync
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`[Cron] Expense already exists for transaction ${transaction.id}, skipping`)
        } else {
          throw error
        }
      }
    }
  }

  // Create income for incoming transactions (negative amounts = money in)
  if (tx.amount < 0) {
    const existingIncome = await prisma.income.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })

    if (!existingIncome) {
      try {
        await prisma.income.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: Math.abs(tx.amount), // Store as positive
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            source: detectIncomeSource(tx),
            status: "pending",
          },
        })
        incomeCreated = true
      } catch (error) {
        // Handle race condition - income was created by concurrent sync
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`[Cron] Income already exists for transaction ${transaction.id}, skipping`)
        } else {
          throw error
        }
      }
    }
  }

  return { expenseCreated, incomeCreated }
}

async function updateTransaction(
  organizationId: string,
  accountId: string,
  tx: PlaidTransaction
): Promise<{ expenseCreated: boolean; incomeCreated: boolean }> {
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

  // Fetch transaction with linked records
  const transaction = await prisma.transaction.findFirst({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    include: { expense: true, income: true },
  })

  let expenseCreated = false
  let incomeCreated = false

  // Update existing expense if linked
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

  // Update existing income if linked
  if (transaction?.income) {
    await prisma.income.update({
      where: { id: transaction.income.id },
      data: {
        amount: Math.abs(tx.amount),
        currency: tx.iso_currency_code || "USD",
        date: new Date(tx.date),
        description: tx.merchant_name || tx.name,
        source: detectIncomeSource(tx),
      },
    })
  }

  // Create expense/income if record is missing (catches old orphaned transactions)
  if (transaction) {
    if (tx.amount > 0 && !transaction.expense) {
      try {
        await prisma.expense.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: Math.abs(tx.amount),
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            expenseType: "variable",
            status: "pending",
            isManual: false,
          },
        })
        expenseCreated = true
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`[Cron] Expense already exists for transaction ${transaction.id}, skipping`)
        } else {
          throw error
        }
      }
    }

    if (tx.amount < 0 && !transaction.income) {
      try {
        await prisma.income.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: Math.abs(tx.amount),
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            source: detectIncomeSource(tx),
            status: "pending",
          },
        })
        incomeCreated = true
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`[Cron] Income already exists for transaction ${transaction.id}, skipping`)
        } else {
          throw error
        }
      }
    }
  }

  return { expenseCreated, incomeCreated }
}
