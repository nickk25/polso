"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import {
  syncTransactions,
  getBalances,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
  type PlaidTransaction,
} from "../lib/plaid-client"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { suggestCategory } from "@/features/intelligence/lib/category-suggester"

interface SyncResult {
  accountsUpdated: number
  transactionsImported: number
  transactionsModified: number
  transactionsRemoved: number
  expensesCreated: number
  incomesCreated: number
}

/**
 * Sync transactions for all active accounts or a specific account
 * Uses Plaid's /transactions/sync with cursor-based pagination
 */
export async function syncTransactionsAction(
  accountId?: string
): Promise<ActionResponse<SyncResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Get accounts to sync (grouped by Plaid Item ID to avoid duplicate API calls)
    const accounts = await prisma.account.findMany({
      where: {
        organizationId,
        status: "active",
        plaidAccessToken: { not: null },
        ...(accountId ? { id: accountId } : {}),
      },
    })

    if (accounts.length === 0) {
      return successResponse({
        accountsUpdated: 0,
        transactionsImported: 0,
        transactionsModified: 0,
        transactionsRemoved: 0,
        expensesCreated: 0,
        incomesCreated: 0,
      })
    }

    // Group accounts by Plaid Item ID (same access token)
    const itemGroups = new Map<string, typeof accounts>()
    for (const account of accounts) {
      if (!account.plaidItemId) continue
      const group = itemGroups.get(account.plaidItemId) || []
      group.push(account)
      itemGroups.set(account.plaidItemId, group)
    }

    // Pre-fetch categories and vendors for auto-categorization
    const [categories, vendors] = await Promise.all([
      prisma.category.findMany({
        where: {
          OR: [{ isSystem: true }, { organizationId }],
        },
        select: { id: true, slug: true },
      }),
      prisma.vendor.findMany({
        where: { organizationId },
        select: {
          id: true,
          normalizedName: true,
          defaultCategoryId: true,
        },
      }),
    ])

    const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))
    const vendorLookup = new Map(
      vendors.map((v) => [
        v.normalizedName,
        { id: v.id, defaultCategoryId: v.defaultCategoryId },
      ])
    )

    let totalTransactionsImported = 0
    let totalTransactionsModified = 0
    let totalTransactionsRemoved = 0
    let totalExpensesCreated = 0
    let totalIncomesCreated = 0
    let accountsUpdated = 0

    // Process each Item (bank connection)
    for (const [itemId, itemAccounts] of itemGroups) {
      const accessToken = itemAccounts[0].plaidAccessToken
      if (!accessToken) continue

      const cursor = itemAccounts[0].plaidCursor

      try {
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
            accountsUpdated++
          }
        }

        // Sync transactions
        const syncResult = await syncTransactions(accessToken, cursor)

        // Process added transactions
        for (const tx of syncResult.added) {
          const account = itemAccounts.find(
            (a: { plaidAccountId: string | null }) => a.plaidAccountId === tx.account_id
          )
          if (!account) continue

          const result = await importTransaction(
            organizationId,
            account.id,
            tx,
            categoryLookup,
            vendorLookup
          )
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
            (a: { plaidAccountId: string | null }) => a.plaidAccountId === tx.account_id
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
      } catch (error) {
        console.error(`Error syncing Item ${itemId}:`, error)

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

    revalidatePath("/banking")
    revalidatePath("/expenses")
    revalidatePath("/income")
    revalidatePath("/dashboard")
    revalidatePath("/analytics")

    return successResponse({
      accountsUpdated,
      transactionsImported: totalTransactionsImported,
      transactionsModified: totalTransactionsModified,
      transactionsRemoved: totalTransactionsRemoved,
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

async function importTransaction(
  organizationId: string,
  accountId: string,
  tx: PlaidTransaction,
  categoryLookup: Map<string, string>,
  vendorLookup: Map<string, { id: string; defaultCategoryId: string | null }>
): Promise<{ expenseCreated: boolean; incomeCreated: boolean }> {
  // Check if transaction already exists
  const existing = await prisma.transaction.findFirst({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    select: { id: true },
  })

  if (existing) {
    return { expenseCreated: false, incomeCreated: false }
  }

  // Determine counterparty name
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Look up vendor by normalized name
  const matchedVendor = normalizedCounterparty
    ? vendorLookup.get(normalizedCounterparty)
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

  let expenseCreated = false
  let incomeCreated = false

  // Create expense for outgoing transactions (positive amounts = money out)
  if (tx.amount > 0 && !tx.pending) {
    // Get category suggestion using layered approach
    const suggestion = suggestCategory(
      {
        vendorDefaultCategoryId: matchedVendor?.defaultCategoryId,
        plaidPrimaryCategory: tx.personal_finance_category?.primary,
        plaidDetailedCategory: tx.personal_finance_category?.detailed,
        merchantName: tx.merchant_name,
        transactionName: tx.name,
      },
      categoryLookup
    )

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
        vendorId: matchedVendor?.id ?? null,
        categoryId: suggestion?.categoryId ?? null,
        categorySource: suggestion?.source ?? null,
        categoryConfidence: suggestion?.confidence ?? null,
      },
    })
    expenseCreated = true
  }

  // Create income for incoming transactions (negative amounts = money in)
  if (tx.amount < 0 && !tx.pending) {
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
  }

  return { expenseCreated, incomeCreated }
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

  // Update associated expense or income if exists
  const transaction = await prisma.transaction.findFirst({
    where: {
      accountId,
      plaidTransactionId: tx.transaction_id,
    },
    include: { expense: true, income: true },
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
}
