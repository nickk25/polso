# packages/banking — @polso/banking

Tink Open Banking client for EU/Spain bank connections. Handles OAuth, token management, transaction fetching, and category mapping.

## What it exports

All types, client functions, and utilities via barrel re-exports from:
- `src/types.ts` — Tink API response types
- `src/tink-client.ts` — API functions (auth, accounts, transactions)
- `src/category-mapping.ts` — Tink category codes → internal category slugs
- `src/normalizer.ts` — raw Tink transaction → `Transaction` shape
- `src/helpers.ts` — token expiry checks, amount parsing

## Key functions (from tink-client.ts)

```typescript
getTinkAccessToken(code, redirectUri)  // exchange OAuth code for access token
refreshTinkToken(refreshToken)         // refresh an expired token
getTinkAccounts(accessToken)           // → TinkAccount[]
getTinkTransactions(accessToken, accountId, from?, to?) // → TinkTransaction[]
```

## Environment variables

```env
TINK_CLIENT_ID      # Tink app client ID
TINK_CLIENT_SECRET  # Tink app client secret
TINK_REDIRECT_URI   # OAuth callback URL (e.g. https://app.polso.com/api/tink/callback)
```

## Zero runtime deps

This package has no workspace dependencies and no external runtime deps beyond `typescript`. All Tink types are defined locally — no Tink SDK.

## Integration points

- `apps/web/features/banking/` — uses this package for the OAuth flow and transaction sync
- `@polso/intelligence` — imports `category-mapping` to map Tink categories to internal slugs
- Cron: `apps/web/app/api/cron/sync-transactions/` — calls `getTinkTransactions` to pull new data
