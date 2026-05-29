# packages/banking — @polso/banking

GoCardless Bank Account Data API client for EU/Spain bank connections. Handles requisitions, token management, account details, balance fetching, transaction syncing, and category mapping.

## What it exports

```typescript
// Client factory
createGoCardlessClient(config: BankingConfig) // → client with all methods below

// Client methods
client.getInstitutions(countryCode)           // → BankProvider[] (for bank picker)
client.getInstitution(id)                     // → GCInstitution | null
client.createEndUserAgreement(institutionId, days)  // → GCAgreement (tries 180d, falls back to 90d)
client.buildLink({ institutionId, agreement, redirect, reference }) // → { requisitionId, link }
client.getRequisition(id)                     // → GCRequisition | null
client.deleteRequisition(id)                  // → void
client.isRequisitionExpired(status)           // → boolean (EX or RJ)
client.getAccounts(requisitionId)             // → BankAccount[] (normalized)
client.getAccountDetails(accountId, token?)  // → GCAccountDetails | null
client.getAccountBalances(accountId, token?) // → GCAccountBalance[]
client.getTransactions(accountId, latest?)   // → BankTransaction[] (latest=true → 7-day window)

// Data transformers
transformAccount({ id, details, balances, institution }) // → BankAccount
transformTransaction({ transaction, accountId, pending }) // → BankTransaction

// Balance utilities
selectPrimaryBalance(balances, currency?)  // → GCAccountBalance (interimBooked > closingBooked > interimAvailable > expected)
getAvailableBalance(balances, currency?)   // → number | null (interimAvailable > expected)
mapCashAccountType(cashAccountType?)       // → { accountType, accountSubtype } (ISO 20022 codes)
getMaxHistoricalDays({ transactionTotalDays, institutionId, separateContinuousHistoryConsent })

// Category mapping
mapGoCardlessToPolsoCategory(mcc?, proprietaryCode?) // → { slug, confidence } | null

// Helpers
detectIncomeSource(tx) // → boolean
```

## Key concepts

**Requisition flow:** Institution picker → `createEndUserAgreement` → `buildLink` → user OAuth → callback → `getRequisition` → fetch accounts

**Token caching:** Service-level access tokens (24h lifetime) are cached in-memory. Safe for serverless — each cold start fetches a fresh token.

**Amount sign convention:** GoCardless uses negative = money out. Polso uses positive = expense. `transformTransaction` negates: `amount = -rawAmount`.

**Balance priority:** `interimBooked` (booked, intraday) > `closingBooked` > `interimAvailable` > `expected`. Available balance uses `interimAvailable` > `expected`.

**Account type mapping:** ISO 20022 `cashAccountType` codes:
- `CACC`, `CASH`, `SACC`, `TRAN`, `SLRY` → depository / checking
- `SVGS`, `MOMA`, `LLSV` → depository / savings
- `CARD` → credit
- `LOAN`, `ODFT`, `MORT` → loan

**Rate limits:** As low as 4 calls/day per account/endpoint. Sync always uses `latest=true` (7-day window) to stay within limits.

**Restricted institutions:** Some Spanish banks (BBVA, CaixaBank, Bankinter, Laboralkutxa, Santander DE) cap historical days at 90 regardless of agreement.

## Environment variables

```env
GOCARDLESS_SECRET_ID      # GoCardless Bank Account Data secret ID
GOCARDLESS_SECRET_KEY     # GoCardless Bank Account Data secret key
GOCARDLESS_REDIRECT_URI   # OAuth callback URL (e.g. https://polso.app/api/gocardless/callback)
```

## Integration points

- `apps/web/app/api/gocardless/` — OAuth flow routes (institutions, create-link, callback)
- `apps/web/features/banking/actions/` — connect/disconnect/sync actions
- `apps/web/app/api/cron/sync-transactions/` — daily sync cron
- `@polso/intelligence` — imports `mapGoCardlessToPolsoCategory` for category suggestions
