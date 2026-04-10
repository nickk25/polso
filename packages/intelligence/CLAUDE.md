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
CategorySource     // type — "vendor_default" | "keyword_match" | "manual"
CategorySuggestion // type — { categoryId, source, confidence }
SuggestionContext  // type — { merchantName, description, amount, existingVendor? }

// Recurring detector
detectRecurringPatterns(expenses)  // → DetectedPattern[]
DetectedPattern    // type — { vendorId, frequency, expectedAmount, confidence, ... }
```

## How it works

**Category suggestion** (priority order):
1. Vendor default — if expense has a `Vendor` with `defaultCategoryId`, use it
2. Keyword match — run `merchantName` + `description` through `KEYWORD_RULES`
3. Falls back to `null` (user must categorize manually)

**Recurring detection**:
- Groups expenses by vendor + approximate amount
- Identifies frequency patterns (weekly/monthly/quarterly/annual)
- Returns patterns with `confidenceScore` — the `intelligence` feature in the app filters by confidence threshold before showing to user

## Dependencies

- `@polso/banking` — for Tink category mapping (used in keyword rules)
- `@polso/db` — for Prisma model types (`Expense`, `Vendor`, etc.)
