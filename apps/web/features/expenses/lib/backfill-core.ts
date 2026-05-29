import { prisma } from "@/lib/db"
import { suggestCategory } from "@polso/intelligence"

export interface BackfillResult {
  vendorsSeeded: number
  expensesCategorized: number
}

/**
 * Two-pass category backfill for an organization:
 *
 * Pass 1 — Seed vendor defaultCategoryId from existing manual categorizations.
 *           Only updates vendors that have no defaultCategoryId yet.
 *
 * Pass 2 — Re-run suggestCategory on uncategorized expenses.
 *           Only applies suggestions with confidence >= 0.7 (skips miscellaneous fallback).
 */
export async function backfillCategoriesCore(organizationId: string): Promise<BackfillResult> {
  const [categories, vendors] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { organizationId }] },
      select: { id: true, slug: true },
    }),
    prisma.vendor.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true },
    }),
  ])

  const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))

  // Pass 1: seed vendor defaultCategoryId from manual categorizations
  const vendorsWithoutDefault = vendors.filter((v) => !v.defaultCategoryId)
  let vendorsSeeded = 0

  if (vendorsWithoutDefault.length > 0) {
    const manualExpenses = await prisma.expense.findMany({
      where: {
        organizationId,
        vendorId: { in: vendorsWithoutDefault.map((v) => v.id) },
        categoryId: { not: null },
        categorySource: "manual",
      },
      select: { vendorId: true, categoryId: true },
    })

    // Count category frequency per vendor
    const vendorCategoryCount = new Map<string, Map<string, number>>()
    for (const e of manualExpenses) {
      if (!e.vendorId || !e.categoryId) continue
      if (!vendorCategoryCount.has(e.vendorId)) {
        vendorCategoryCount.set(e.vendorId, new Map())
      }
      const counts = vendorCategoryCount.get(e.vendorId)!
      counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1)
    }

    for (const [vendorId, counts] of vendorCategoryCount) {
      let best: string | null = null
      let bestCount = 0
      for (const [catId, count] of counts) {
        if (count > bestCount) { best = catId; bestCount = count }
      }
      if (best) {
        await prisma.vendor.update({
          where: { id: vendorId },
          data: { defaultCategoryId: best },
        })
        vendorsSeeded++
      }
    }
  }

  // Reload vendors after seeding so pass 2 picks up the new defaults
  const updatedVendors = await prisma.vendor.findMany({
    where: { organizationId },
    select: { id: true, defaultCategoryId: true },
  })
  const vendorDefaultMap = new Map(updatedVendors.map((v) => [v.id, v.defaultCategoryId]))

  // Pass 2: suggest category for uncategorized expenses
  const uncategorized = await prisma.expense.findMany({
    where: { organizationId, categoryId: null },
    select: {
      id: true,
      vendorId: true,
      description: true,
      transaction: {
        select: { name: true, merchantName: true, category: true, categoryDetailed: true },
      },
    },
  })

  // Build historical data from all categorized expenses in this org
  const historicalExpenses = await prisma.expense.findMany({
    where: { organizationId, categoryId: { not: null } },
    select: {
      categoryId: true,
      transaction: { select: { merchantName: true } },
    },
  })

  const merchantCategoryCount = new Map<string, Map<string, number>>()
  for (const e of historicalExpenses) {
    const key = e.transaction?.merchantName?.toLowerCase().trim()
    if (!key || !e.categoryId) continue
    if (!merchantCategoryCount.has(key)) merchantCategoryCount.set(key, new Map())
    const counts = merchantCategoryCount.get(key)!
    counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1)
  }

  function mostFrequent(map: Map<string, number>): string | null {
    let best: string | null = null
    let bestCount = 0
    for (const [key, count] of map) {
      if (count > bestCount) { best = key; bestCount = count }
    }
    return best
  }

  let expensesCategorized = 0

  for (const expense of uncategorized) {
    const vendorDefaultCategoryId = expense.vendorId ? vendorDefaultMap.get(expense.vendorId) ?? null : null
    const merchantKey = expense.transaction?.merchantName?.toLowerCase().trim() ?? null
    const historicalCategoryId = merchantKey ? mostFrequent(merchantCategoryCount.get(merchantKey) ?? new Map()) : null

    const suggestion = suggestCategory(
      {
        vendorDefaultCategoryId,
        historicalCategoryId,
        providerPrimaryCategory: expense.transaction?.category ?? null,
        providerDetailedCategory: expense.transaction?.categoryDetailed ?? null,
        merchantName: expense.transaction?.merchantName ?? null,
        transactionName: expense.transaction?.name ?? expense.description ?? null,
      },
      categoryLookup
    )

    if (suggestion && suggestion.confidence >= 0.7) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          categoryId: suggestion.categoryId,
          categorySource: suggestion.source,
          categoryConfidence: suggestion.confidence,
        },
      })
      expensesCategorized++
    }
  }

  return { vendorsSeeded, expensesCategorized }
}
