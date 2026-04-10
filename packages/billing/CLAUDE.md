# packages/billing — @polso/billing

Creem payment API client for subscriptions and checkout flows.

## What it exports

```typescript
// Creem API functions
creemFetch<T>(endpoint, options?)        // authenticated fetch wrapper
getCreemSubscription(subscriptionId)    // → CreemSubscription
getCreemPortalUrl(customerId)           // → string | null
createCreemCheckout(params)             // → CreemCheckoutSession
cancelCreemSubscription(subscriptionId) // → CreemSubscription (cancel_at_period_end)

// Product helpers
CREEM_PRODUCTS                          // { starter: { monthly, annual }, business: { monthly, annual } }
getProductId(plan, interval)           // → product ID string
getProductInfo(productId)              // → { plan, interval } | null
isCreemTestMode()                       // → boolean (CREEM_TEST_MODE === "true")
getCreemApiBase()                       // → API base URL (test vs prod)

// Types
CreemCustomer, CreemSubscription, CreemCheckoutSession
```

## Dependencies

`@polso/plans` — for `PlanType` and `PlanInterval` types.

## Environment variables

```env
CREEM_API_KEY                          # Creem API key
CREEM_TEST_MODE                        # "true" for test environment
CREEM_STARTER_MONTHLY_PRODUCT_ID       # Creem product ID
CREEM_STARTER_ANNUAL_PRODUCT_ID
CREEM_BUSINESS_MONTHLY_PRODUCT_ID
CREEM_BUSINESS_ANNUAL_PRODUCT_ID
```

## Adding a new plan tier

1. Add the plan to `@polso/plans` first
2. Add env var + entry in `CREEM_PRODUCTS` in `src/creem-client.ts`
