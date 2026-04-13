import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import {
  createTinkClient,
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
const STALE_THRESHOLD_HOURS = 1

function getTinkClient() {
  return createTinkClient({
    clientId: process.env.TINK_CLIENT_ID!,
    clientSecret: process.env.TINK_CLIENT_SECRET!,
    redirectUri: process.env.TINK_REDIRECT_URI!,
  })
}

/**
 * Background sync job for all stale accounts.
 * Called by Vercel Cron (configured in vercel.json).
 * Security: requires CRON_SECRET header or query param.
 */
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
      tinkAccessToken: { not: null },
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

  // Group by tinkCredentialId (one API call covers all accounts per bank connection)
  const credentialGroups = new Map<string, typeof accounts>()
  for (const account of accounts) {
    if (!account.tinkCredentialId) continue
    const group = credentialGroups.get(account.tinkCredentialId) ?? []
    group.push(account)
    credentialGroups.set(account.tinkCredentialId, group)
  }

  const tink = getTinkClient()
  let accountsSynced = 0
  let accountsFailed = 0
  let totalImported = 0
  let totalModified = 0
  let totalExpenses = 0
  let totalIncomes = 0

  for (const [credentialId, credAccounts] of credentialGroups) {
    const organizationId = credAccounts[0].organizationId
    try {
      console.log(
        `[Cron] Syncing credential ${credentialId} for org ${credAccounts[0].organization.name}`
      )

      // Refresh token if needed
      const lead = credAccounts[0]
      const isExpired =
        !lead.tinkTokenExpiresAt ||
        lead.tinkTokenExpiresAt.getTime() < Date.now() + 60_000

      let accessToken = lead.tinkAccessToken!
      if (isExpired && lead.tinkRefreshToken) {
        const refreshed = await tink.refreshAccessToken(lead.tinkRefreshToken)
        accessToken = refreshed.accessToken
        await prisma.account.updateMany({
          where: { tinkCredentialId: credentialId },
          data: {
            tinkAccessToken: refreshed.accessToken,
            tinkRefreshToken: refreshed.refreshToken,
            tinkTokenExpiresAt: refreshed.expiresAt,
          },
        })
      }

      // Refresh balances
      const freshAccounts = await tink.getBalances(accessToken)
      for (const credAccount of credAccounts) {
        const fresh = freshAccounts.find(
          (a) => a.externalAccountId === credAccount.externalAccountId
        )
        if (fresh) {
          await prisma.account.update({
            where: { id: credAccount.id },
            data: {
              balanceAvailable: fresh.balanceAvailable,
              balanceCurrent: fresh.balanceCurrent,
              balanceLimit: fresh.balanceLimit,
              lastSyncedAt: new Date(),
              syncError: null,
            },
          })
          accountsSynced++
        }
      }

      // Fetch all transaction pages
      let pageToken: string | null = null
      let pageCount = 0
      do {
        const result = await tink.getTransactions(accessToken, pageToken)

        for (const tx of result.transactions) {
          const account = credAccounts.find(
            (a) => a.externalAccountId === tx.externalAccountId
          )
          if (!account) continue

          const { imported, modified, expenseCreated, incomeCreated } =
            await upsertTransaction(organizationId, account.id, tx)

          if (imported) totalImported++
          if (modified) totalModified++
          if (expenseCreated) totalExpenses++
          if (incomeCreated) totalIncomes++
        }

        pageToken = result.nextPageToken
        pageCount++
      } while (pageToken)

      console.log(
        `[Cron] Credential ${credentialId}: ${pageCount} pages fetched, +${totalImported} new transactions`
      )
    } catch (error) {
      console.error(`[Cron] Error syncing credential ${credentialId}:`, error)
      accountsFailed += credAccounts.length
      await prisma.account.updateMany({
        where: { tinkCredentialId: credentialId },
        data: {
          syncError: error instanceof Error ? error.message : "Sync failed",
          lastSyncedAt: new Date(),
        },
      })
    }
  }

  // Run alert detection for all synced orgs
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
    `[Cron] Done in ${duration}ms: ${accountsSynced} accounts synced, ${totalImported} new transactions, ${alertsCreated} alerts created`
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
