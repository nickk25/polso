"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@polso/db"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import {
  createTinkClient,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
  type BankTransaction,
} from "@polso/banking"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { suggestCategory } from "@/features/intelligence/lib/category-suggester"
import { findOrCreateVendor, type MatchedVendor } from "@/features/vendors/lib/vendor-matcher"
import { findOrCreateClient, type MatchedClient } from "@/features/clients/lib/client-matcher"

interface SyncResult {
  accountsUpdated: number
  transactionsImported: number
  transactionsModified: number
  expensesCreated: number
  incomesCreated: number
}

function getTinkClient() {
  return createTinkClient({
    clientId: process.env.TINK_CLIENT_ID!,
    clientSecret: process.env.TINK_CLIENT_SECRET!,
    redirectUri: process.env.TINK_REDIRECT_URI!,
  })
}

/**
 * Ensure the account's access token is fresh, refreshing if needed.
 * Returns the valid access token.
 */
async function getValidToken(account: {
  id: string
  tinkAccessToken: string | null
  tinkRefreshToken: string | null
  tinkTokenExpiresAt: Date | null
}): Promise<string> {
  const tink = getTinkClient()

  // Check if token is still valid (with 60s buffer)
  const isExpired =
    !account.tinkTokenExpiresAt ||
    account.tinkTokenExpiresAt.getTime() < Date.now() + 60_000

  if (!account.tinkAccessToken || (isExpired && account.tinkRefreshToken)) {
    if (!account.tinkRefreshToken) {
      throw new Error("No refresh token available — user must reconnect bank")
    }

    const refreshed = await tink.refreshAccessToken(account.tinkRefreshToken)

    await prisma.account.update({
      where: { id: account.id },
      data: {
        tinkAccessToken: refreshed.accessToken,
        tinkRefreshToken: refreshed.refreshToken,
        tinkTokenExpiresAt: refreshed.expiresAt,
      },
    })

    return refreshed.accessToken
  }

  return account.tinkAccessToken
}

/**
 * Sync transactions for all active accounts or a specific account.
 * Fetches all pages from Tink and upserts — deduplication handled by
 * the @@unique([organizationId, externalTransactionId]) constraint.
 */
export async function syncTransactionsAction(
  accountId?: string
): Promise<ActionResponse<SyncResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        status: "active",
        tinkAccessToken: { not: null },
        ...(accountId ? { id: accountId } : {}),
      },
    })

    if (accounts.length === 0) {
      return successResponse({
        accountsUpdated: 0,
        transactionsImported: 0,
        transactionsModified: 0,
        expensesCreated: 0,
        incomesCreated: 0,
      })
    }

    // Group by tinkCredentialId (same token covers all accounts from one bank)
    const credentialGroups = new Map<string, typeof accounts>()
    for (const account of accounts) {
      if (!account.tinkCredentialId) continue
      const group = credentialGroups.get(account.tinkCredentialId) ?? []
      group.push(account)
      credentialGroups.set(account.tinkCredentialId, group)
    }

    // Pre-fetch categories, vendors, and clients for auto-categorization
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

    // Build merchant history lookup for historical categorization
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

    let totalTransactionsImported = 0
    let totalTransactionsModified = 0
    let totalExpensesCreated = 0
    let totalIncomesCreated = 0
    let accountsUpdated = 0

    const tink = getTinkClient()

    for (const [credentialId, credAccounts] of credentialGroups) {
      try {
        const accessToken = await getValidToken(credAccounts[0])

        // Refresh balances for all accounts in this credential
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
            accountsUpdated++
          }
        }

        // Fetch all transaction pages
        let pageToken: string | null = null
        do {
          const result = await tink.getTransactions(accessToken, pageToken)

          for (const tx of result.transactions) {
            const account = credAccounts.find(
              (a) => a.externalAccountId === tx.externalAccountId
            )
            if (!account) continue

            const { imported, modified, expenseCreated, incomeCreated } =
              await upsertTransaction(
                organizationId,
                account.id,
                tx,
                categoryLookup,
                vendorLookup,
                clientLookup,
                merchantHistory
              )

            if (imported) totalTransactionsImported++
            if (modified) totalTransactionsModified++
            if (expenseCreated) totalExpensesCreated++
            if (incomeCreated) totalIncomesCreated++
          }

          pageToken = result.nextPageToken
        } while (pageToken)

        // Advance page token (null = fully synced)
        await prisma.account.updateMany({
          where: { tinkCredentialId: credentialId },
          data: { syncPageToken: null },
        })
      } catch (error) {
        console.error(`Error syncing credential ${credentialId}:`, error)
        await prisma.account.updateMany({
          where: { tinkCredentialId: credentialId },
          data: {
            syncError: error instanceof Error ? error.message : "Sync failed",
            lastSyncedAt: new Date(),
          },
        })
      }
    }

    revalidatePath("/settings/banking")
    revalidatePath("/expenses")
    revalidatePath("/incomes")
    revalidatePath("/dashboard")
    revalidatePath("/analytics")
    revalidatePath("/vendors")
    revalidatePath("/clients")

    return successResponse({
      accountsUpdated,
      transactionsImported: totalTransactionsImported,
      transactionsModified: totalTransactionsModified,
      expensesCreated: totalExpensesCreated,
      incomesCreated: totalIncomesCreated,
    })
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to sync transactions",
      "SYNC_ERROR"
    )
  }
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
): Promise<{ imported: boolean; modified: boolean; expenseCreated: boolean; incomeCreated: boolean }> {
  const counterpartyName = tx.merchantName ?? tx.name ?? null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Look up or create vendor for expenses
  let matchedVendor: MatchedVendor | null = normalizedCounterparty
    ? (vendorLookup.get(normalizedCounterparty) ?? null)
    : null

  if (!matchedVendor && normalizedCounterparty && counterpartyName && tx.amount > 0) {
    const vendor = await findOrCreateVendor(organizationId, counterpartyName, vendorLookup)
    matchedVendor = vendor
    vendorLookup.set(normalizedCounterparty, vendor)
  }

  // Upsert transaction using organizationId + externalTransactionId for deduplication
  const existing = await prisma.transaction.findFirst({
    where: {
      organizationId,
      externalTransactionId: tx.externalTransactionId,
    },
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
      data: {
        organizationId,
        externalTransactionId: tx.externalTransactionId,
        ...txData,
      },
      select: { id: true },
    })
    imported = true
  }

  let expenseCreated = false
  let incomeCreated = false

  // Create expense for outgoing transactions (positive amount = money out)
  if (tx.amount > 0) {
    const existingExpense = await prisma.expense.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })

    if (!existingExpense) {
      const merchantKey = tx.merchantName?.toLowerCase().trim() ?? null
      const history = merchantKey ? merchantHistory.get(merchantKey) : null
      const historicalCategoryId = history ? mostFrequentInMap(history.categories) : null
      const historicalTxCount = history ? [...history.expenseTypes.values()].reduce((a, b) => a + b, 0) : 0
      const historicalExpenseType = history && historicalTxCount >= 2
        ? mostFrequentInMap(history.expenseTypes)
        : null

      const suggestion = suggestCategory(
        {
          vendorDefaultCategoryId: matchedVendor?.defaultCategoryId,
          historicalCategoryId,
          providerPrimaryCategory: tx.category,
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Race condition — already created by concurrent sync
        } else {
          throw error
        }
      }
    }
  }

  // Create income for incoming transactions (negative amount = money in)
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Race condition
        } else {
          throw error
        }
      }
    } else if (modified) {
      // Update existing income amount when transaction was modified
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
    // Update existing expense amount when transaction was modified
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

  return { imported, modified, expenseCreated, incomeCreated }
}
