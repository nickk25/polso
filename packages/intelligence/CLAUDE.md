# packages/intelligence — @polso/intelligence

Auto-categorization and recurring expense pattern detection logic.

## What it exports

```typescript
// Keyword rules
KEYWORD_RULES              // KeywordRule[] — static keyword → category mappings
matchKeywordRules(text)    // → KeywordRule | null — match merchant name against rules
KeywordRule                // type — { pattern, categorySlug, expenseType, confidence }

// Category suggester
suggestCategory(context)          // → CategorySuggestion | null — single transaction
suggestCategoriesBatch(contexts)  // → CategorySuggestion[] — batch processing
CategorySource     // type — "vendor" | "history" | "provider" | "keyword" | "manual"
CategorySuggestion // type — { categoryId, categorySlug, source, confidence }
SuggestionContext  // type — { vendorDefaultCategoryId, historicalCategoryId, providerPrimaryCategory, providerDetailedCategory, merchantName, transactionName }

// Recurring detector
detectRecurringPatterns(expenses)  // → DetectedPattern[]
DetectedPattern    // type — { vendorId, frequency, expectedAmount, confidence, ... }

// Anomaly detector
detectAnomalies(expenses, options?)  // → DetectedAnomaly[] — pure, no DB access
AnomalyInput     // type — { id, amount, description, categoryId, categoryName, categoryAvg, categoryCount }
DetectedAnomaly  // type — { expenseId, description, amount, categoryName, categoryAvg }
```

## How it works

**Category suggestion** (priority order):
1. Vendor default — if `vendorDefaultCategoryId` provided (95% confidence)
2. Historical — if `historicalCategoryId` provided, most frequent for this merchant (88% confidence)
3. Provider mapping — Tink category → Polso category via `mapTinkToPolsoCategory` (70-80% confidence)
4. Keyword match — run `merchantName` + `transactionName` through `KEYWORD_RULES` (70-85% confidence)
5. Falls back to `null` (user must categorize manually)

**Anomaly detection** (`detectAnomalies`):
- Pure function — callers pre-fetch category averages and pass as `AnomalyInput[]`
- Flags expenses where `amount >= categoryAvg * multiplier` (default 2×)
- Requires at least `minDataPoints` (default 3) historical records to avoid false positives
- Used by `apps/web` cron (`detect-alerts`) and `apps/partner` proactive agent

**Recurring detection**:
- Groups expenses by vendor + approximate amount
- Identifies frequency patterns (weekly/monthly/quarterly/annual)
- Returns patterns with `confidenceScore` — the `intelligence` feature in the app filters by confidence threshold before showing to user

## Dependencies

- `@polso/banking` — for Tink category mapping (used in keyword rules)
- `@polso/db` — for Prisma model types (`Expense`, `Vendor`, etc.)
