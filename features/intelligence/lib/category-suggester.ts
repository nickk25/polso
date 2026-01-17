/**
 * Category Suggestion Engine
 *
 * Automatically suggests categories for expenses using a layered approach:
 * 1. Vendor default category (highest priority, 95% confidence)
 * 2. Plaid category mapping (80-90% confidence)
 * 3. Keyword/merchant name matching (70-85% confidence)
 */

import { mapPlaidToPolsoCategory } from "./plaid-category-mapping"
import { matchKeywordRules } from "./keyword-rules"

export type CategorySource = "vendor" | "plaid" | "keyword" | "manual"

export interface CategorySuggestion {
  categoryId: string
  categorySlug: string
  confidence: number
  source: CategorySource
}

export interface SuggestionContext {
  vendorDefaultCategoryId?: string | null
  plaidPrimaryCategory?: string | null
  plaidDetailedCategory?: string | null
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
    // Find the slug for this category ID
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
    // If vendor has a default but it's not in our lookup, still use it
    return {
      categoryId: context.vendorDefaultCategoryId,
      categorySlug: "unknown",
      confidence: 0.95,
      source: "vendor",
    }
  }

  // Priority 2: Plaid category mapping (80-90% confidence)
  const plaidMatch = mapPlaidToPolsoCategory(
    context.plaidPrimaryCategory,
    context.plaidDetailedCategory
  )

  if (plaidMatch) {
    const categoryId = categoryLookup.get(plaidMatch.slug)
    if (categoryId) {
      return {
        categoryId,
        categorySlug: plaidMatch.slug,
        confidence: plaidMatch.confidence,
        source: "plaid",
      }
    }
  }

  // Priority 3: Keyword matching (70-85% confidence)
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

  // Priority 4: Fallback to "Miscellaneous" (50% confidence)
  const miscellaneousId = categoryLookup.get("miscellaneous")
  if (miscellaneousId) {
    return {
      categoryId: miscellaneousId,
      categorySlug: "miscellaneous",
      confidence: 0.5,
      source: "keyword", // Use keyword as source since it's a fallback rule
    }
  }

  // No match found (shouldn't happen if Miscellaneous category exists)
  return null
}

/**
 * Batch suggest categories for multiple expenses
 * More efficient than calling suggestCategory individually
 *
 * @param contexts - Array of expense contexts to categorize
 * @param categoryLookup - Map of category slug to category ID
 * @returns Map of index to CategorySuggestion
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
