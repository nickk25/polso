# packages/banking — @polso/banking

GoCardless Bank Account Data API client for EU/Spain bank connections. Handles requisitions, token management, account details, balance fetching, transaction syncing, and category mapping.

## What it exports

```typescript
// Client factory
createGoCardlessClient(config: BankingConfig) // → client with all methods below

// Typed errors
GCApiError        // any non-OK GoCardless response — has .status
GCRateLimitError  // 429 — extends GCApiError, has .retryAfterSeconds

// Client methods
client.getAccessToken()                       // → string (cached service token)
client.getInstitutions(countryCode)           // → BankProvider[] (for bank picker)
client.getInstitution(id)                     // → GCInstitution | null
client.createEndUserAgreement(institutionId, days)  // → GCAgreement (tries 180d, falls back to 90d)
client.buildLink({ institutionId, agreement, redirect, reference }) // → { requisitionId, link }
client.getRequisition(id)                     // → GCRequisition | null
client.deleteRequisition(id)                  // → void
client.isRequisitionExpired(status)           // → boolean (EX or RJ)
client.getAccounts(requisitionId)             // → BankAccount[] (normalized)
client.getAccountDetails(accountId, token?)  // → GCAccountDetails | null (null only on 404)
client.getAccountBalances(accountId, token?) // → GCAccountBalance[]
client.getTransactions(accountId, latest?)   // → BankTransaction[] (latest=true → 7-day window; booked only, pending skipped)

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
getTransactionType(amount)            // → "debit" | "credit" (Polso sign convention)
detectIncomeSource(tx)                // → "salary" | "investment" | "refund" | "transfer" | "other"
canonicalize(name, { structured })    // → { matchKey, displayName, seenLocations } — canonical vendor identity
brandTokens(matchKey)                 // → string[] — brand tokens for merge blocking ([] for gov keys)
isGovKey(matchKey)                    // → boolean — true for "gov:*" government keys
normalizeCounterpartyName(name)       // → string — LEGACY shim, superseded by canonicalize()
extractVendorFromDescription(desc)    // → string | null — Spanish bank statement patterns (currently never called)
```

> **Vendor identity — `canonicalize` (`src/canonicalize.ts`, see `docs/VENDOR_MATCHING_AUDIT.md`):** the single source of truth for counterparty dedup, run once at ingestion. Government carve-out first (`gov:tgss`, `gov:diputacion foral de:<province>` — province/agency is the discriminator; TGSS is one vendor, deliberately not split by CCC). Then: processor rewrites, card/commission/ref strip, digit/PAN killer, location→`seenLocations`, legal-suffix/subsidiary/stopword strip, contains-based alias map (folds in the legacy `VENDOR_MAPPINGS`). Structured payee names (`creditorName`/`debtorName`) pass `{ structured: true }` to skip the aggressive strip. Tested in `src/canonicalize.test.ts` (oracle + idempotency); validated on real prod data (241 rows → 90 vendors, 0 wrongful merges). `normalizeCounterpartyName` is now a legacy shim, no longer used by sync.

## Key concepts

**Requisition flow:** Institution picker → `createEndUserAgreement` → `buildLink` → user OAuth → callback → `getRequisition` → fetch accounts

**Token caching:** Service-level access tokens (24h lifetime) are cached in Redis via `@polso/cache` (~23.5h TTL) so they survive cold starts, with an in-memory fast path per invocation. Institutions are also cached in Redis for 24h.

**Error semantics:** `getRequisition` and `getAccountDetails` return `null` only on 404; `deleteRequisition` treats 404 as already-deleted. All other failures (429, auth, 5xx) throw `GCApiError` / `GCRateLimitError` so callers never mistake a transient error for missing data. Transient 5xx on idempotent GETs are retried once.

**Amount sign convention:** GoCardless uses negative = money out. Polso uses positive = expense. `transformTransaction` negates: `amount = -rawAmount`.

**Balance priority:** `interimBooked` (booked, intraday) > `closingBooked` > `interimAvailable` > `expected`. Available balance uses `interimAvailable` > `expected`.

**Account type mapping:** ISO 20022 `cashAccountType` codes:
- `CACC`, `CASH`, `SACC`, `TRAN`, `TRAS`, `SLRY` → depository / checking
- `SVGS`, `MOMA`, `LLSV` → depository / savings
- `CARD` → credit
- `LOAN`, `ODFT`, `MORT` → loan

**Rate limits:** As low as 4 calls/day per account/endpoint. Sync always uses `latest=true` (7-day window) to stay within limits.

**Restricted institutions:** Some banks (BBVA, CaixaBank, Bankinter, Laboralkutxa, Santander DE, BRED, Swedbank) cap historical days at 90 regardless of agreement, as do institutions with `separate_continuous_history_consent`.

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
