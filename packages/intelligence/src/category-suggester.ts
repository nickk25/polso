/**
 * Category Suggestion Engine
 *
 * Automatically suggests categories for expenses using a layered approach:
 * 1. Vendor default category (highest priority, 95% confidence)
 * 2. Historical merchant data (88% confidence)
 * 3. Provider category mapping (70-80% confidence)
 * 4. Keyword/merchant name matching (70-85% confidence)
 */

import { mapTinkToPolsoCategory } from "@polso/banking"
import { matchKeywordRules } from "./keyword-rules"

export type CategorySource = "vendor" | "history" | "provider" | "keyword" | "manual"

export interface CategorySuggestion {
  categoryId: string
  categorySlug: string
  confidence: number
  source: CategorySource
}

export interface SuggestionContext {
  vendorDefaultCategoryId?: string | null
  historicalCategoryId?: string | null // most frequent category for this merchant
  providerPrimaryCategory?: string | null
  providerDetailedCategory?: string | null
  merchantName?: string | null
  transactionName?: string | null
}

/**
 * Suggest a category for an expense based on available context
 *
 * @param context - Information about the expense to categorize
 * @param categoryLookup - Map of category slug to category ID
 * @returns CategorySuggestion or null if no match found
 */
export function suggestCategory(
  context: SuggestionContext,
  categoryLookup: Map<string, string>
): CategorySuggestion | null {
  // Priority 1: Vendor default category (95% confidence)
  if (context.vendorDefaultCategoryId) {
    for (const [slug, id] of categoryLookup) {
      if (id === context.vendorDefaultCategoryId) {
        return {
          categoryId: context.vendorDefaultCategoryId,
          categorySlug: slug,
          confidence: 0.95,
          source: "vendor",
        }
      }
    }
    return {
      categoryId: context.vendorDefaultCategoryId,
      categorySlug: "unknown",
      confidence: 0.95,
      source: "vendor",
    }
  }

  // Priority 2: Historical merchant data (88% confidence)
  if (context.historicalCategoryId) {
    const slug = [...categoryLookup.entries()].find(([, id]) => id === context.historicalCategoryId)?.[0] ?? "unknown"
    return {
      categoryId: context.historicalCategoryId,
      categorySlug: slug,
      confidence: 0.88,
      source: "history",
    }
  }

  // Priority 3: Provider category mapping (70-80% confidence)
  const providerMatch = mapTinkToPolsoCategory(
    context.providerPrimaryCategory,
    context.providerDetailedCategory
  )

  if (providerMatch) {
    const categoryId = categoryLookup.get(providerMatch.slug)
    if (categoryId) {
      return {
        categoryId,
        categorySlug: providerMatch.slug,
        confidence: providerMatch.confidence,
        source: "provider",
      }
    }
  }

  // Priority 4: Keyword matching (70-85% confidence)
  const keywordMatch = matchKeywordRules(
    context.merchantName,
    context.transactionName
  )

  if (keywordMatch) {
    const categoryId = categoryLookup.get(keywordMatch.slug)
    if (categoryId) {
      return {
        categoryId,
        categorySlug: keywordMatch.slug,
        confidence: keywordMatch.confidence,
        source: "keyword",
      }
    }
  }

  // Priority 5: Fallback to "Miscellaneous" (50% confidence)
  const miscellaneousId = categoryLookup.get("miscellaneous")
  if (miscellaneousId) {
    return {
      categoryId: miscellaneousId,
      categorySlug: "miscellaneous",
      confidence: 0.5,
      source: "keyword",
    }
  }

  return null
}

/**
 * Batch suggest categories for multiple expenses
 */
export function suggestCategoriesBatch(
  contexts: SuggestionContext[],
  categoryLookup: Map<string, string>
): Map<number, CategorySuggestion> {
  const results = new Map<number, CategorySuggestion>()

  for (let i = 0; i < contexts.length; i++) {
    const suggestion = suggestCategory(contexts[i], categoryLookup)
    if (suggestion) {
      results.set(i, suggestion)
    }
  }

  return results
}
