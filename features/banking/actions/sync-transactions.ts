"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/lib/generated/prisma/client"
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
import { findOrCreateVendor, type MatchedVendor } from "@/features/vendors/lib/vendor-matcher"
import { findOrCreateClient, type MatchedClient } from "@/features/clients/lib/client-matcher"

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

    // Pre-fetch categories, vendors, and clients for auto-categorization
    const [categories, vendors, clients] = await Promise.all([
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
      prisma.client.findMany({
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
    const clientLookup = new Map(
      clients.map((c) => [
        c.normalizedName,
        { id: c.id, defaultCategoryId: c.defaultCategoryId },
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
            vendorLookup,
            clientLookup
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
            // Delete linked expense/income before the transaction
            // (schema uses onDelete: SetNull which would orphan them)
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
  vendorLookup: Map<string, { id: string; defaultCategoryId: string | null }>,
  clientLookup: Map<string, { id: string; defaultCategoryId: string | null }>
): Promise<{ expenseCreated: boolean; incomeCreated: boolean }> {
  // Determine counterparty name
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  // Look up or create vendor for expenses
  let matchedVendor: MatchedVendor | null = normalizedCounterparty
    ? vendorLookup.get(normalizedCounterparty) ?? null
    : null

  if (!matchedVendor && normalizedCounterparty && counterpartyName && tx.amount > 0) {
    const vendor = await findOrCreateVendor(organizationId, counterpartyName, vendorLookup)
    matchedVendor = vendor
    vendorLookup.set(normalizedCounterparty, vendor)
  }

  // Upsert transaction - handles duplicates gracefully including relinks
  // Uses organizationId + plaidTransactionId to detect duplicates even when account changes
  const transaction = await prisma.transaction.upsert({
    where: {
      organizationId_plaidTransactionId: {
        organizationId,
        plaidTransactionId: tx.transaction_id,
      },
    },
    update: {
      // Update account link (important for relinked banks)
      accountId,
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
            vendorId: matchedVendor?.id ?? null,
            categoryId: suggestion?.categoryId ?? null,
            categorySource: suggestion?.source ?? null,
            categoryConfidence: suggestion?.confidence ?? null,
          },
        })
        expenseCreated = true
      } catch (error) {
        // Handle race condition - expense was created by concurrent sync
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`Expense already exists for transaction ${transaction.id}, skipping`)
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
      // Look up or create client for income
      let matchedClient: MatchedClient | null = normalizedCounterparty
        ? clientLookup.get(normalizedCounterparty) ?? null
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
            amount: Math.abs(tx.amount), // Store as positive
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            source: detectIncomeSource(tx),
            status: "pending",
            clientId: matchedClient?.id ?? null,
          },
        })
        incomeCreated = true
      } catch (error) {
        // Handle race condition - income was created by concurrent sync
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          console.log(`Income already exists for transaction ${transaction.id}, skipping`)
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
    // Create expense for outgoing (positive amount) if none exists
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
          // Already exists — race condition with concurrent sync
        } else {
          throw error
        }
      }
    }

    // Create income for incoming (negative amount) if none exists
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
          // Already exists — race condition with concurrent sync
        } else {
          throw error
        }
      }
    }
  }

  return { expenseCreated, incomeCreated }
}
