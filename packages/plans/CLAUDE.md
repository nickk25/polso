# packages/plans — @polso/plans

Plan definitions, pricing, limits, and feature flags. Leaf package — zero runtime deps, no workspace deps.

## What it exports

```typescript
// Types
PlanType       // "starter" | "business"
PlanInterval   // "monthly" | "annual"
LimitKey       // "maxBankConnections" | "maxUsers"
PlanLimits, PlanPricing, PlanInfo

// Constants
PLAN_LIMITS    // { starter: { maxBankConnections: 1, maxUsers: 2 }, business: { maxBankConnections: 3, maxUsers: 5 } }
PLAN_PRICES    // monthly/annual prices per plan
PLAN_INFO      // display name + description per plan
PLAN_FEATURES  // Record<PlanType, string[]> — feature description strings per plan (for pricing UI)

// Functions
getLimit(plan, key)               // → number limit for a plan+key
isWithinLimit(plan, key, current) // → boolean
hasCapacity(plan, key, current)   // → boolean (alias)
getRemainingCapacity(plan, key, current) // → number
getPlanDisplayName(plan)          // → "Starter" | "Business"
getAllPlans()                      // → PlanType[]
isValidPlan(str)                  // → type guard
getUpgradePlan(current)           // → next plan up, or null if already business
```

## How to add a new limit

1. Add the key to `LimitKey` and the `PlanLimits` interface in `src/types.ts`
2. Add values for each plan in `PLAN_LIMITS` in `src/features.ts`

## How to add a new plan

1. Add to `PlanType` in `src/types.ts`
2. Add entries in `PLAN_LIMITS`, `PLAN_PRICES`, `PLAN_INFO`, `PLAN_FEATURES` in `src/features.ts`
3. Update the hardcoded plan lists in `src/check-limits.ts` — `getAllPlans`, `isValidPlan`, `getUpgradePlan`
4. Update `@polso/billing` — add product ID constant and env var
