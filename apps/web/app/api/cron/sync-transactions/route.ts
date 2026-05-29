import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import {
  createGoCardlessClient,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
  type BankTransaction,
} from "@polso/banking"
import {
  detectLowBalanceAlerts,
  detectHighSpendAlerts,
  detectRunwayCriticalAlerts,
  detectUnusualActivityAlerts,
} from "@/features/alerts/lib/detect-alerts"

const CRON_SECRET = process.env.CRON_SECRET
// GoCardless rate limits: as low as 4 calls/day per account endpoint.
// Daily sync uses latest=true (7-day window) to stay well within limits.
const STALE_THRESHOLD_HOURS = 20

function getGoCardlessClient() {
  return createGoCardlessClient({
    secretId: process.env.GOCARDLESS_SECRET_ID!,
    secretKey: process.env.GOCARDLESS_SECRET_KEY!,
    redirectUri: process.env.GOCARDLESS_REDIRECT_URI!,
  })
}

export async function GET(request: NextRequest) {
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
    console.error("[Cron] Sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

interface SyncResult {
  accountsSynced: number
  accountsFailed: number
  transactionsImported: number
  transactionsModified: number
  expensesCreated: number
  incomesCreated: number
  alertsCreated: number
  alertErrors: number
  duration: number
}

async function syncAllAccounts(): Promise<SyncResult> {
  const startTime = Date.now()
  const staleDate = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)

  const accounts = await prisma.account.findMany({
    where: {
      status: "active",
      requisitionId: { not: null },
      externalAccountId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleDate } }],
    },
    include: { organization: { select: { id: true, name: true } } },
  })

  if (accounts.length === 0) {
    return {
      accountsSynced: 0,
      accountsFailed: 0,
      transactionsImported: 0,
      transactionsModified: 0,
      expensesCreated: 0,
      incomesCreated: 0,
      alertsCreated: 0,
      alertErrors: 0,
      duration: Date.now() - startTime,
    }
  }

  console.log(`[Cron] Syncing ${accounts.length} stale accounts`)

  // Group by requisitionId — check connection status once per bank connection
  const requisitionGroups = new Map<string, typeof accounts>()
  for (const account of accounts) {
    if (!account.requisitionId) continue
    const group = requisitionGroups.get(account.requisitionId) ?? []
    group.push(account)
    requisitionGroups.set(account.requisitionId, group)
  }

  const gc = getGoCardlessClient()
  let accountsSynced = 0
  let accountsFailed = 0
  let totalImported = 0
  let totalModified = 0
  let totalExpenses = 0
  let totalIncomes = 0

  for (const [requisitionId, reqAccounts] of requisitionGroups) {
    const organizationId = reqAccounts[0].organizationId
    const orgName = reqAccounts[0].organization.name

    // Check if the GoCardless connection is still active
    const requisition = await gc.getRequisition(requisitionId)
    if (requisition && gc.isRequisitionExpired(requisition.status)) {
      console.log(
        `[Cron] Requisition ${requisitionId} expired for org ${orgName} — marking accounts`
      )
      await prisma.account.updateMany({
        where: { requisitionId, organizationId },
        data: { status: "expired", syncError: "Bank connection has expired — please reconnect" },
      })
      accountsFailed += reqAccounts.length
      continue
    }

    console.log(
      `[Cron] Syncing ${reqAccounts.length} account(s) for requisition ${requisitionId} (org: ${orgName})`
    )

    for (const account of reqAccounts) {
      if (!account.externalAccountId) continue

      try {
        // Refresh balance
        const balances = await gc.getAccountBalances(account.externalAccountId)
        const primaryBalance =
          balances.find((b) => b.balanceType === "interimBooked") ?? balances[0]
        const balanceCurrent = primaryBalance
          ? parseFloat(primaryBalance.balanceAmount.amount)
          : null

        await prisma.account.update({
          where: { id: account.id },
          data: {
            balanceCurrent,
            lastSyncedAt: new Date(),
            syncError: null,
            syncErrorRetries: 0,
          },
        })
        accountsSynced++

        // Fetch last 7 days of transactions (latest=true respects rate limits)
        const transactions = await gc.getTransactions(account.externalAccountId, true)

        for (const tx of transactions) {
          const { imported, modified, expenseCreated, incomeCreated } =
            await upsertTransaction(organizationId, account.id, tx)

          if (imported) totalImported++
          if (modified) totalModified++
          if (expenseCreated) totalExpenses++
          if (incomeCreated) totalIncomes++
        }

        console.log(
          `[Cron] Account ${account.id}: +${transactions.length} transactions fetched`
        )
      } catch (error) {
        console.error(`[Cron] Error syncing account ${account.id}:`, error)
        accountsFailed++
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

  // Alert detection for all synced orgs
  const syncedOrgIds = [...new Set(accounts.map((a) => a.organizationId))]
  let alertsCreated = 0
  let alertErrors = 0

  for (const organizationId of syncedOrgIds) {
    try {
      const [low, high, runway, unusual] = await Promise.all([
        detectLowBalanceAlerts(organizationId),
        detectHighSpendAlerts(organizationId),
        detectRunwayCriticalAlerts(organizationId),
        detectUnusualActivityAlerts(organizationId),
      ])
      alertsCreated += low + high + runway + unusual
    } catch (error) {
      console.error(`[Cron] detect-alerts error for org ${organizationId}:`, error)
      alertErrors++
    }
  }

  const duration = Date.now() - startTime
  console.log(
    `[Cron] Done in ${duration}ms: ${accountsSynced} synced, ${totalImported} new, ${alertsCreated} alerts`
  )

  return {
    accountsSynced,
    accountsFailed,
    transactionsImported: totalImported,
    transactionsModified: totalModified,
    expensesCreated: totalExpenses,
    incomesCreated: totalIncomes,
    alertsCreated,
    alertErrors,
    duration,
  }
}

async function upsertTransaction(
  organizationId: string,
  accountId: string,
  tx: BankTransaction
): Promise<{ imported: boolean; modified: boolean; expenseCreated: boolean; incomeCreated: boolean }> {
  const counterpartyName = tx.merchantName ?? tx.name ?? null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  const existing = await prisma.transaction.findFirst({
    where: { organizationId, externalTransactionId: tx.externalTransactionId },
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

  let expenseCreated = false
  let incomeCreated = false

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
            currency: tx.currency,
            date: tx.date,
            description: tx.merchantName ?? tx.name,
            expenseType: "variable",
            status: "pending",
            isManual: false,
          },
        })
        expenseCreated = true
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error
        }
      }
    }
  }

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
            amount: Math.abs(tx.amount),
            currency: tx.currency,
            date: tx.date,
            description: tx.merchantName ?? tx.name,
            source: detectIncomeSource(tx),
            status: "pending",
          },
        })
        incomeCreated = true
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error
        }
      }
    }
  }

  return { imported, modified, expenseCreated, incomeCreated }
}
