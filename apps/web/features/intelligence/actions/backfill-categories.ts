"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { suggestCategory } from "@polso/intelligence"

interface BackfillResult {
  total: number
  categorized: number
  skipped: number
}

/**
 * Backfill categories for uncategorized expenses
 * Uses the same suggestion engine as transaction sync
 */
export async function backfillCategoriesAction(): Promise<ActionResponse<BackfillResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Get all categories for lookup
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { organizationId }],
      },
      select: { id: true, slug: true },
    })
    const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))

    // Get all vendors with default categories
    const vendors = await prisma.vendor.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true },
    })
    const vendorLookup = new Map(
      vendors.map((v) => [v.normalizedName, { id: v.id, defaultCategoryId: v.defaultCategoryId }])
    )

    // Build merchant history: most frequent (categoryId, expenseType) per merchantName
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

    function mostFrequent(map: Map<string, number>): string | null {
      let best: string | null = null
      let bestCount = 0
      for (const [key, count] of map) {
        if (count > bestCount) { best = key; bestCount = count }
      }
      return best
    }

    // Get uncategorized expenses with their transaction data
    const expenses = await prisma.expense.findMany({
      where: {
        organizationId,
        categoryId: null,
      },
      include: {
        transaction: {
          select: {
            merchantName: true,
            name: true,
            category: true,
            categoryDetailed: true,
            counterpartyName: true,
          },
        },
        vendor: {
          select: {
            id: true,
            defaultCategoryId: true,
          },
        },
      },
    })

    let categorized = 0
    let skipped = 0

    for (const expense of expenses) {
      // Try to match vendor by counterparty name if no vendor is set
      const counterpartyName = expense.transaction?.counterpartyName
      const matchedVendor = expense.vendor
        ? { id: expense.vendor.id, defaultCategoryId: expense.vendor.defaultCategoryId }
        : counterpartyName
          ? vendorLookup.get(counterpartyName)
          : null

      // Look up merchant history for this transaction
      const merchantKey = expense.transaction?.merchantName?.toLowerCase().trim() ?? null
      const history = merchantKey ? merchantHistory.get(merchantKey) : null
      const historicalCategoryId = history ? mostFrequent(history.categories) : null
      // Only use historical expenseType if there are at least 2 past transactions
      const historicalExpenseType =
        history && history.expenseTypes.size > 0 && [...history.expenseTypes.values()].reduce((a, b) => a + b, 0) >= 2
          ? mostFrequent(history.expenseTypes)
          : null

      // Get category suggestion
      const suggestion = suggestCategory(
        {
          vendorDefaultCategoryId: matchedVendor?.defaultCategoryId,
          historicalCategoryId,
          providerPrimaryCategory: expense.transaction?.category,
          providerDetailedCategory: expense.transaction?.categoryDetailed,
          merchantName: expense.transaction?.merchantName,
          transactionName: expense.transaction?.name,
        },
        categoryLookup
      )

      if (suggestion) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            categoryId: suggestion.categoryId,
            categorySource: suggestion.source,
            categoryConfidence: suggestion.confidence,
            ...(historicalExpenseType && { expenseType: historicalExpenseType }),
            ...(matchedVendor && !expense.vendor && { vendorId: matchedVendor.id }),
          },
        })
        categorized++
      } else {
        skipped++
      }
    }

    revalidatePath("/expenses")
    revalidatePath("/dashboard")
    revalidatePath("/categories")

    return successResponse({
      total: expenses.length,
      categorized,
      skipped,
    })
  } catch (error) {
    console.error("Error backfilling categories:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to backfill categories",
      "ERROR"
    )
  }
}
