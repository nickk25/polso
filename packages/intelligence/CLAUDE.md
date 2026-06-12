# packages/intelligence — @polso/intelligence

Auto-categorization and recurring expense pattern detection logic.

## What it exports

```typescript
// Keyword rules
KEYWORD_RULES              // KeywordRule[] — static keyword → category mappings
matchKeywordRules(merchantName, transactionName)  // → { slug, confidence, matchedKeyword } | null
KeywordRule                // type — { patterns: string[], categorySlug, confidence }

// Category suggester
suggestCategory(context, categoryLookup)          // → CategorySuggestion | null — single transaction
suggestCategoriesBatch(contexts, categoryLookup)  // → Map<number, CategorySuggestion> — index → suggestion
// categoryLookup: Map<string, string> of category slug → category ID
CategorySource     // type — "vendor" | "history" | "provider" | "keyword" | "manual"
CategorySuggestion // type — { categoryId, categorySlug, confidence, source }
SuggestionContext  // type — { vendorDefaultCategoryId, historicalCategoryId, providerPrimaryCategory, providerDetailedCategory, merchantName, transactionName }

// Recurring detector
detectRecurringPatterns(expenses)  // → DetectedPattern[]
DetectedPattern    // type — { name, counterpartyId, frequency, expectedAmount, amountVariancePct, expectedDayOfMonth, categoryId, confidenceScore, firstOccurrence, lastOccurrence, occurrenceCount, entryIds }

// Anomaly detector
detectAnomalies(expenses, options?)  // → DetectedAnomaly[] — pure, no DB access
AnomalyInput     // type — { id, amount, description, categoryId, categoryName, categoryAvg, categoryCount }
DetectedAnomaly  // type — { entryId, description, amount, categoryName, categoryAvg }
```

## How it works

**Category suggestion** (priority order):
1. Vendor default — if `vendorDefaultCategoryId` provided (95% confidence)
2. Historical — if `historicalCategoryId` provided, most frequent for this merchant (88% confidence)
3. Provider mapping — GoCardless MCC/proprietary code → Polso category via `mapGoCardlessToPolsoCategory` (70-80% confidence)
4. Keyword match — run `merchantName` + `transactionName` through `KEYWORD_RULES` (70-85% confidence)
5. Falls back to the `miscellaneous` category (50% confidence) if present in `categoryLookup`; returns `null` only when it is not

**Anomaly detection** (`detectAnomalies`):
- Pure function — callers pre-fetch category averages and pass as `AnomalyInput[]`
- Flags expenses where `amount >= categoryAvg * multiplier` (default 2×)
- Requires at least `minDataPoints` (default 3) historical records to avoid false positives
- Used by `apps/web` cron (`detect-alerts`) and `apps/partner` proactive agent

**Recurring detection**:
- Groups expenses by counterparty `normalizedName` (falls back to lowercased description); skips `status: "excluded"` entries
- Identifies frequency patterns (weekly/biweekly/monthly/quarterly/yearly) from average intervals; rejects groups with amount variance > 30%
- Returns patterns sorted by `confidenceScore` — drops anything below 0.5 internally; min 2 occurrences per pattern

## Dependencies

- `@polso/banking` — for GoCardless category mapping (used in the category suggester)
- `@polso/db` — for Prisma model types (`Expense`, `Vendor`, etc.)
