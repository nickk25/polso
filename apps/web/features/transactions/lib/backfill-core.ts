import { prisma } from "@/lib/db"
import { suggestCategory } from "@polso/intelligence"

export interface BackfillResult {
  counterpartiesSeeded: number
  entriesCategorized: number
}

/**
 * Two-pass category backfill for an organization:
 *
 * Pass 1 — Seed counterparty defaultCategoryId from existing manual categorizations.
 *           Only updates counterparties that have no defaultCategoryId yet.
 *
 * Pass 2 — Re-run suggestCategory on uncategorized entries.
 *           Only applies suggestions with confidence >= 0.7.
 */
export async function backfillCategoriesCore(organizationId: string): Promise<BackfillResult> {
  const [categories, counterparties] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { organizationId }] },
      select: { id: true, slug: true },
    }),
    prisma.counterparty.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true, defaultCategoryId: true },
    }),
  ])

  const categoryLookup = new Map(categories.map((c) => [c.slug, c.id]))

  // Pass 1: seed counterparty defaultCategoryId from manual categorizations
  const counterpartiesWithoutDefault = counterparties.filter((c) => !c.defaultCategoryId)
  let counterpartiesSeeded = 0

  if (counterpartiesWithoutDefault.length > 0) {
    const manualEntries = await prisma.entry.findMany({
      where: {
        organizationId,
        counterpartyId: { in: counterpartiesWithoutDefault.map((c) => c.id) },
        categoryId: { not: null },
        categorySource: "manual",
      },
      select: { counterpartyId: true, categoryId: true },
    })

    const counterpartyCategoryCount = new Map<string, Map<string, number>>()
    for (const e of manualEntries) {
      if (!e.counterpartyId || !e.categoryId) continue
      if (!counterpartyCategoryCount.has(e.counterpartyId)) {
        counterpartyCategoryCount.set(e.counterpartyId, new Map())
      }
      const counts = counterpartyCategoryCount.get(e.counterpartyId)!
      counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1)
    }

    for (const [counterpartyId, counts] of counterpartyCategoryCount) {
      let best: string | null = null
      let bestCount = 0
      for (const [catId, count] of counts) {
        if (count > bestCount) { best = catId; bestCount = count }
      }
      if (best) {
        await prisma.counterparty.update({
          where: { id: counterpartyId },
          data: { defaultCategoryId: best },
        })
        counterpartiesSeeded++
      }
    }
  }

  // Reload after seeding so pass 2 picks up new defaults
  const updatedCounterparties = await prisma.counterparty.findMany({
    where: { organizationId },
    select: { id: true, defaultCategoryId: true },
  })
  const counterpartyDefaultMap = new Map(
    updatedCounterparties.map((c) => [c.id, c.defaultCategoryId])
  )

  // Pass 2: suggest category for uncategorized entries
  const uncategorized = await prisma.entry.findMany({
    where: { organizationId, categoryId: null },
    select: {
      id: true,
      counterpartyId: true,
      description: true,
      transaction: {
        select: { name: true, merchantName: true, category: true, categoryDetailed: true },
      },
    },
  })

  const historicalEntries = await prisma.entry.findMany({
    where: { organizationId, categoryId: { not: null } },
    select: {
      categoryId: true,
      transaction: { select: { merchantName: true } },
    },
  })

  const merchantCategoryCount = new Map<string, Map<string, number>>()
  for (const e of historicalEntries) {
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

  let entriesCategorized = 0

  for (const entry of uncategorized) {
    const counterpartyDefaultCategoryId = entry.counterpartyId
      ? (counterpartyDefaultMap.get(entry.counterpartyId) ?? null)
      : null
    const merchantKey = entry.transaction?.merchantName?.toLowerCase().trim() ?? null
    const historicalCategoryId = merchantKey
      ? mostFrequent(merchantCategoryCount.get(merchantKey) ?? new Map())
      : null

    const suggestion = suggestCategory(
      {
        vendorDefaultCategoryId: counterpartyDefaultCategoryId,
        historicalCategoryId,
        providerPrimaryCategory: entry.transaction?.category ?? null,
        providerDetailedCategory: entry.transaction?.categoryDetailed ?? null,
        merchantName: entry.transaction?.merchantName ?? null,
        transactionName: entry.transaction?.name ?? entry.description ?? null,
      },
      categoryLookup
    )

    if (suggestion && suggestion.confidence >= 0.7) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: {
          categoryId: suggestion.categoryId,
          categorySource: suggestion.source,
          categoryConfidence: suggestion.confidence,
        },
      })
      entriesCategorized++
    }
  }

  return { counterpartiesSeeded, entriesCategorized }
}
