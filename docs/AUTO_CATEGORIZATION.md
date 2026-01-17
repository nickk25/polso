# Auto-Categorization System

This document describes the expense auto-categorization system and provides a roadmap for enhancing or replacing it with an LLM-based approach.

## Overview

The auto-categorization system automatically assigns categories to expenses when transactions are synced from Plaid. It uses a layered, rule-based approach with three priority levels.

## Current Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transaction Sync Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Plaid Transaction                                             │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              Category Suggester                          │  │
│   │  ┌─────────────────────────────────────────────────────┐│  │
│   │  │ Priority 1: Vendor Default (95% confidence)         ││  │
│   │  │ - Check if vendor has defaultCategoryId set         ││  │
│   │  └─────────────────────────────────────────────────────┘│  │
│   │                      │ No match                         │  │
│   │                      ▼                                  │  │
│   │  ┌─────────────────────────────────────────────────────┐│  │
│   │  │ Priority 2: Plaid Mapping (80-90% confidence)       ││  │
│   │  │ - Map personal_finance_category to Polso category   ││  │
│   │  └─────────────────────────────────────────────────────┘│  │
│   │                      │ No match                         │  │
│   │                      ▼                                  │  │
│   │  ┌─────────────────────────────────────────────────────┐│  │
│   │  │ Priority 3: Keyword Matching (70-85% confidence)    ││  │
│   │  │ - Match merchant name against keyword rules         ││  │
│   │  └─────────────────────────────────────────────────────┘│  │
│   └─────────────────────────────────────────────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│   Expense Created with:                                         │
│   - categoryId                                                  │
│   - categorySource: "vendor" | "plaid" | "keyword" | null       │
│   - categoryConfidence: 0.0 - 1.0                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
features/intelligence/lib/
├── category-suggester.ts      # Main suggestion engine
├── plaid-category-mapping.ts  # Plaid → Polso category mappings
├── keyword-rules.ts           # Keyword-based matching rules
└── recurring-detector.ts      # Existing recurring pattern detection
```

### Key Files

| File | Purpose |
|------|---------|
| `category-suggester.ts` | Main entry point - `suggestCategory()` function |
| `plaid-category-mapping.ts` | Static mapping tables for Plaid categories |
| `keyword-rules.ts` | Keyword/merchant name matching rules |
| `sync-transactions.ts` | Integration point in banking module |

### Data Model

```prisma
model Expense {
  categoryId         String?   // The assigned category
  categorySource     String?   // "vendor" | "plaid" | "keyword" | "manual"
  categoryConfidence Float?    // 0.0 - 1.0 confidence score
}
```

### Suggestion Context

The suggester receives this context for each expense:

```typescript
interface SuggestionContext {
  vendorDefaultCategoryId?: string | null  // From matched vendor
  plaidPrimaryCategory?: string | null     // e.g., "FOOD_AND_DRINK"
  plaidDetailedCategory?: string | null    // e.g., "FOOD_AND_DRINK_RESTAURANT"
  merchantName?: string | null             // e.g., "Starbucks"
  transactionName?: string | null          // e.g., "STARBUCKS #12345"
}
```

### System Categories (Polso)

| Slug | Name | Type |
|------|------|------|
| `rent-mortgage` | Rent & Mortgage | fixed |
| `utilities` | Utilities | fixed |
| `insurance` | Insurance | fixed |
| `subscriptions` | Subscriptions | fixed |
| `salaries-payroll` | Salaries & Payroll | fixed |
| `loan-payments` | Loan Payments | fixed |
| `office-supplies` | Office Supplies | variable |
| `marketing-ads` | Marketing & Ads | variable |
| `software-tools` | Software & Tools | variable |
| `travel-transport` | Travel & Transport | variable |
| `meals-entertainment` | Meals & Entertainment | variable |
| `professional-services` | Professional Services | variable |
| `equipment` | Equipment | variable |
| `miscellaneous` | Miscellaneous | variable |

---

## Limitations of Current System

1. **Static mappings** - Cannot learn from user corrections
2. **Limited context** - Only uses merchant name and Plaid category
3. **No semantic understanding** - "AWS" matches subscriptions but could be hosting (variable)
4. **No organization context** - Doesn't consider industry or spending patterns
5. **Binary matching** - No fuzzy matching or similarity scoring
6. **No transaction amount context** - $5 at Starbucks vs $500 at Starbucks (catering?)

---

## LLM Enhancement Roadmap

### Option A: Hybrid Approach (Recommended)

Keep rule-based system as fast path, use LLM for edge cases and learning.

```
┌─────────────────────────────────────────────────────────────────┐
│                   Enhanced Category Suggester                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Fast Path (Existing Rules)                               │  │
│   │ - Vendor default                                         │  │
│   │ - High-confidence Plaid mapping (>85%)                   │  │
│   │ - High-confidence keyword match (>80%)                   │  │
│   └─────────────────────────────────────────────────────────┘  │
│                      │ Low confidence or no match              │
│                      ▼                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ LLM Path (New)                                           │  │
│   │ - Full transaction context                               │  │
│   │ - Organization spending patterns                         │  │
│   │ - Historical corrections                                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Fast for common cases (no API calls)
- LLM only for ambiguous cases
- Cost-effective
- Graceful fallback if LLM unavailable

### Option B: Full LLM Replacement

Replace entire system with LLM-based categorization.

**Pros:**
- Consistent behavior
- Better accuracy for edge cases
- Can explain reasoning

**Cons:**
- Higher latency
- Higher cost
- Requires batching for bulk imports

---

## LLM Integration Design

### 1. Prompt Template

```typescript
const CATEGORIZATION_PROMPT = `
You are a financial categorization assistant for a business expense management system.

## Available Categories
{{categories}}

## Transaction Details
- Merchant: {{merchantName}}
- Description: {{transactionName}}
- Amount: {{amount}} {{currency}}
- Date: {{date}}
- Plaid Category: {{plaidCategory}}

## Organization Context
- Industry: {{orgIndustry}}
- Recent similar transactions: {{recentSimilar}}
- User corrections for this merchant: {{corrections}}

## Task
Categorize this transaction into ONE of the available categories.

Return JSON:
{
  "categorySlug": "the-category-slug",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}
`
```

### 2. New Interface

```typescript
// features/intelligence/lib/llm-categorizer.ts

export interface LLMCategorizationRequest {
  merchantName: string | null
  transactionName: string | null
  amount: number
  currency: string
  date: Date
  plaidCategory: string | null
  plaidDetailedCategory: string | null

  // Enhanced context for LLM
  organizationId: string
  recentSimilarTransactions?: Transaction[]
  userCorrections?: CategoryCorrection[]
}

export interface LLMCategorizationResponse {
  categorySlug: string
  confidence: number
  reasoning: string
}

export async function categorizewithLLM(
  request: LLMCategorizationRequest,
  categories: Category[]
): Promise<LLMCategorizationResponse>
```

### 3. Learning from Corrections

Track when users change categories to improve future suggestions:

```prisma
model CategoryCorrection {
  id                String   @id @default(cuid())
  organizationId    String   @map("organization_id")

  // What was suggested
  originalCategoryId   String?  @map("original_category_id")
  originalSource       String?  @map("original_source")
  originalConfidence   Float?   @map("original_confidence")

  // What user chose
  correctedCategoryId  String   @map("corrected_category_id")

  // Context for learning
  merchantName         String?  @map("merchant_name")
  transactionName      String?  @map("transaction_name")
  plaidCategory        String?  @map("plaid_category")
  amount               Float

  createdAt            DateTime @default(now()) @map("created_at")

  @@index([organizationId, merchantName])
  @@map("category_corrections")
}
```

### 4. Batch Processing

For bulk imports, batch LLM requests:

```typescript
export async function categorizeWithLLMBatch(
  requests: LLMCategorizationRequest[],
  categories: Category[],
  batchSize: number = 10
): Promise<Map<number, LLMCategorizationResponse>>
```

---

## Implementation Steps

### Phase 1: Correction Tracking
1. Add `CategoryCorrection` model to schema
2. Track corrections in `updateExpenseAction`
3. Build correction history per merchant

### Phase 2: LLM Integration
1. Create `llm-categorizer.ts` module
2. Add LLM provider configuration (OpenAI/Anthropic)
3. Implement prompt template with context injection
4. Add caching layer for repeated merchants

### Phase 3: Hybrid System
1. Update `category-suggester.ts` to call LLM for low-confidence cases
2. Add confidence threshold configuration
3. Implement async/background categorization for bulk imports

### Phase 4: Learning Loop
1. Use corrections to update keyword rules automatically
2. Fine-tune prompts based on correction patterns
3. Consider organization-specific category mappings

---

## API Cost Considerations

| Scenario | Transactions/Month | LLM Calls (20% edge cases) | Est. Cost |
|----------|-------------------|---------------------------|-----------|
| Small business | 500 | 100 | ~$0.50 |
| Medium business | 5,000 | 1,000 | ~$5.00 |
| Large business | 50,000 | 10,000 | ~$50.00 |

*Assuming GPT-4o-mini at ~$0.0005/call with batching*

---

## Testing Strategy

### Unit Tests
```typescript
describe("category-suggester", () => {
  it("should prioritize vendor default over Plaid mapping")
  it("should fall back to keyword matching when no Plaid match")
  it("should return null when no match found")
})

describe("llm-categorizer", () => {
  it("should parse LLM response correctly")
  it("should handle LLM errors gracefully")
  it("should respect confidence threshold")
})
```

### Integration Tests
- Sync transactions with various merchant names
- Verify correct categories assigned
- Test correction tracking

### Evaluation Metrics
- **Accuracy**: % of expenses correctly categorized (vs user corrections)
- **Coverage**: % of expenses that receive a category suggestion
- **Latency**: Time to categorize (p50, p95, p99)
- **Cost**: LLM API costs per transaction

---

## References

- [Plaid Transaction Categories](https://plaid.com/docs/api/products/transactions/#transactionsget)
- Current implementation: `features/intelligence/lib/category-suggester.ts`
- Integration point: `features/banking/actions/sync-transactions.ts`
