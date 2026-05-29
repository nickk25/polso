"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import {
  createGoCardlessClient,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
  mapGoCardlessToPolsoCategory,
  type BankTransaction,
} from "@polso/banking"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { suggestCategory } from "@polso/intelligence"
import { findOrCreateVendor, type MatchedVendor } from "@/features/vendors/lib/vendor-matcher"
import { findOrCreateClient, type MatchedClient } from "@/features/clients/lib/client-matcher"
import { matchAfterSync } from "@/features/inbox/lib/match-after-sync"

interface SyncResult {
  accountsUpdated: number
  transactionsImported: number
  transactionsModified: number
  expensesCreated: number
  incomesCreated: number
}

function getGoCardlessClient() {
  return createGoCardlessClient({
    secretId: process.env.GOCARDLESS_SECRET_ID!,
    secretKey: process.env.GOCARDLESS_SECRET_KEY!,
    redirectUri: process.env.GOCARDLESS_REDIRECT_URI!,
  })
}

async function syncTransactionsCore(
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
    return { accountsUpdated: 0, transactionsImported: 0, transactionsModified: 0, expensesCreated: 0, incomesCreated: 0 }
  }

  // Group by requisitionId to check connection status once per bank connection
  const requisitionGroups = new Map<string, typeof accounts>()
  for (const account of accounts) {
    if (!account.requisitionId) continue
    const group = requisitionGroups.get(account.requisitionId) ?? []
    group.push(account)
    requisitionGroups.set(account.requisitionId, group)
  }

  // Pre-fetch categories, vendors, and clients
  const [categories, vendors, clients] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { organizationId }] },
      select: { id: true, slug: true },
    }),
    prisma.vendor.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true },
    }),
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true },
    }),
  ])

  const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))
  const vendorLookup = new Map(
    vendors.map((v) => [v.normalizedName, { id: v.id, defaultCategoryId: v.defaultCategoryId }])
  )
  const clientLookup = new Map(
    clients.map((c) => [c.normalizedName, { id: c.id, defaultCategoryId: c.defaultCategoryId }])
  )

  const historicalExpenses = await prisma.expense.findMany({
    where: { organizationId, categoryId: { not: null } },
    select: {
      categoryId: true,
      expenseType: true,
      transaction: { select: { merchantName: true } },
    },
  })

  const merchantHistory = new Map<string, {
    categories: Map<string, number>
    expenseTypes: Map<string, number>
  }>()

  for (const e of historicalExpenses) {
    const key = e.transaction?.merchantName?.toLowerCase().trim()
    if (!key || !e.categoryId) continue
    if (!merchantHistory.has(key)) {
      merchantHistory.set(key, { categories: new Map(), expenseTypes: new Map() })
    }
    const h = merchantHistory.get(key)!
    h.categories.set(e.categoryId, (h.categories.get(e.categoryId) ?? 0) + 1)
    h.expenseTypes.set(e.expenseType, (h.expenseTypes.get(e.expenseType) ?? 0) + 1)
  }

  const gc = getGoCardlessClient()

  let totalTransactionsImported = 0
  let totalTransactionsModified = 0
  let totalExpensesCreated = 0
  let totalIncomesCreated = 0
  let accountsUpdated = 0
  const newTransactionIds: string[] = []

  for (const [requisitionId, reqAccounts] of requisitionGroups) {
    // Check requisition status — mark disconnected if expired/rejected
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
        // Fetch updated balance
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
        accountsUpdated++

        // initial=true → latest=false → fetch full history; initial=false → latest=true → last 7 days
        const transactions = await gc.getTransactions(account.externalAccountId, !initial)

        for (const tx of transactions) {
          const { imported, modified, expenseCreated, incomeCreated, transactionId } =
            await upsertTransaction(
              organizationId,
              account.id,
              tx,
              categoryLookup,
              vendorLookup,
              clientLookup,
              merchantHistory
            )

          if (imported) { totalTransactionsImported++; newTransactionIds.push(transactionId) }
          if (modified) totalTransactionsModified++
          if (expenseCreated) totalExpensesCreated++
          if (incomeCreated) totalIncomesCreated++
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
            // Auto-disconnect after 3 consecutive failures (Midday pattern)
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

  return {
    accountsUpdated,
    transactionsImported: totalTransactionsImported,
    transactionsModified: totalTransactionsModified,
    expensesCreated: totalExpensesCreated,
    incomesCreated: totalIncomesCreated,
  }
}

export async function syncTransactionsAction(
  accountId?: string,
  initial = false
): Promise<ActionResponse<SyncResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await syncTransactionsCore(organizationId, accountId, initial)

    revalidatePath("/settings/banking")
    revalidatePath("/expenses")
    revalidatePath("/incomes")
    revalidatePath("/dashboard")
    revalidatePath("/analytics")
    revalidatePath("/vendors")
    revalidatePath("/clients")

    return successResponse(result)
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to sync transactions",
      "SYNC_ERROR"
    )
  }
}

/**
 * For use from API route handlers that already have organizationId.
 * Syncs all active accounts for the org. initial=true fetches full history.
 */
export async function syncTransactionsForOrg(
  organizationId: string,
  initial = false
): Promise<void> {
  await syncTransactionsCore(organizationId, undefined, initial)
}

type MerchantHistory = Map<string, { categories: Map<string, number>; expenseTypes: Map<string, number> }>

function mostFrequentInMap(map: Map<string, number>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of map) {
    if (count > bestCount) { best = key; bestCount = count }
  }
  return best
}

async function upsertTransaction(
  organizationId: string,
  accountId: string,
  tx: BankTransaction,
  categoryLookup: Map<string, string>,
  vendorLookup: Map<string, { id: string; defaultCategoryId: string | null }>,
  clientLookup: Map<string, { id: string; defaultCategoryId: string | null }>,
  merchantHistory: MerchantHistory = new Map()
): Promise<{ imported: boolean; modified: boolean; expenseCreated: boolean; incomeCreated: boolean; transactionId: string }> {
  const counterpartyName = tx.merchantName ?? tx.name ?? null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  let matchedVendor: MatchedVendor | null = normalizedCounterparty
    ? (vendorLookup.get(normalizedCounterparty) ?? null)
    : null

  if (!matchedVendor && normalizedCounterparty && counterpartyName && tx.amount > 0) {
    const vendor = await findOrCreateVendor(organizationId, counterpartyName, vendorLookup)
    matchedVendor = vendor
    vendorLookup.set(normalizedCounterparty, vendor)
  }

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
      const merchantKey = tx.merchantName?.toLowerCase().trim() ?? null
      const history = merchantKey ? merchantHistory.get(merchantKey) : null
      const historicalCategoryId = history ? mostFrequentInMap(history.categories) : null
      const historicalTxCount = history
        ? [...history.expenseTypes.values()].reduce((a, b) => a + b, 0)
        : 0
      const historicalExpenseType =
        history && historicalTxCount >= 2 ? mostFrequentInMap(history.expenseTypes) : null

      // Map GoCardless MCC / proprietary code to Polso category
      const gcCategory = mapGoCardlessToPolsoCategory(tx.categoryDetailed, tx.category)

      const suggestion = suggestCategory(
        {
          vendorDefaultCategoryId: matchedVendor?.defaultCategoryId,
          historicalCategoryId,
          providerPrimaryCategory: gcCategory?.slug ?? tx.category,
          providerDetailedCategory: tx.categoryDetailed,
          merchantName: tx.merchantName,
          transactionName: tx.name,
        },
        categoryLookup
      )

      try {
        await prisma.expense.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: tx.amount,
            currency: tx.currency,
            date: tx.date,
            description: tx.merchantName ?? tx.name,
            expenseType: historicalExpenseType ?? "variable",
            status: "pending",
            isManual: false,
            vendorId: matchedVendor?.id ?? null,
            categoryId: suggestion?.categoryId ?? null,
            categorySource: suggestion?.source ?? null,
            categoryConfidence: suggestion?.confidence ?? null,
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
      let matchedClient: MatchedClient | null = normalizedCounterparty
        ? (clientLookup.get(normalizedCounterparty) ?? null)
        : null

      if (!matchedClient && normalizedCounterparty && counterpartyName) {
        const client = await findOrCreateClient(organizationId, counterpartyName, clientLookup)
        matchedClient = client
        clientLookup.set(normalizedCounterparty, client)
      }

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
            clientId: matchedClient?.id ?? null,
          },
        })
        incomeCreated = true
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error
        }
      }
    } else if (modified) {
      await prisma.income.update({
        where: { transactionId: transaction.id },
        data: {
          amount: Math.abs(tx.amount),
          currency: tx.currency,
          date: tx.date,
          description: tx.merchantName ?? tx.name,
          source: detectIncomeSource(tx),
        },
      })
    }
  } else if (tx.amount > 0 && modified) {
    const existingExpense = await prisma.expense.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })
    if (existingExpense) {
      await prisma.expense.update({
        where: { id: existingExpense.id },
        data: {
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          description: tx.merchantName ?? tx.name,
        },
      })
    }
  }

  return { imported, modified, expenseCreated, incomeCreated, transactionId: transaction.id }
}
