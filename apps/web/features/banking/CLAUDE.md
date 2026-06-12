# features/banking

GoCardless bank connections and transaction sync — backs /settings/banking and feeds the entire Transaction/Entry pipeline.

## Files

- `actions/connect-bank.ts` — `disconnectBankAction` (deletes requisition, queues `RequisitionCleanupQueue` on failure), `reconnectBankAction` (delete old requisition → fresh link via `createBankLink`, avoids double-billing), `refreshBankConnectionAction` (reset status to active)
- `actions/sync-transactions.ts` — `syncTransactionsAction` (manual sync with 30-min per-account Redis cooldown, fails open) and `startManualSyncAction` (background sync via `after()`, signals progress with `lastSyncedAt: null`; full history only for accounts with zero transactions)
- `lib/sync-core.ts` — `syncTransactionsCore()`: org-level Redis lock, per-account GoCardless rate-limit cooldowns, requisition expiry check (only near expiry or on errors), balance + transaction fetch, `upsertTransaction` (creates Transaction + Entry with counterparty match and category suggestion from merchant history / `suggestCategory`), 3-strike disconnect; then `matchAfterSync` + `backfillCategoriesCore`
- `lib/create-bank-link.ts` — `createBankLink(orgId, institutionId)`: end-user agreement + requisition, persists `PendingRequisition` (consent expiry anchored at agreement creation) for the OAuth callback to claim
- `lib/gocardless-client.ts` — `getGoCardlessClient()`: env-configured `@polso/banking` client factory
- `queries/get-accounts.ts` — `getAccounts`, `hasConnectedBank`, `getAccount`, `getAccountsWithBalance`, `getAccountsSummary`
- `components/` — `SyncMonitor` (polls `/api/banking/sync-status` every 3s, mounted in the dashboard layout) + `SyncToastContent` toast UI (loading/success/error)

## Key flows

- Sync entry points all funnel into `syncTransactionsCore`: daily cron `/api/cron/sync-transactions`, GoCardless OAuth callback (initial sync), and the two manual actions — the org Redis lock serializes them
- Direction convention: positive amount = expense, negative = income; Entry amounts stored as `Math.abs`
- `GCRateLimitError` → cooldown + retry later (no strikes); other sync errors increment `syncErrorRetries`, 3 strikes → status `disconnected`
- After-sync side effects: receipt matching (`features/inbox`), category backfill (`features/transactions`); actions revalidate /settings/banking, /transactions, /dashboard, /analytics, /counterparties, /clients

## Data & integration

- Models: Account, Transaction, Entry, PendingRequisition, RequisitionCleanupQueue, Category, Counterparty
- i18n namespace: `banking` (used by settings/onboarding UIs; this feature's components are not translated)
- Used by / uses: `/api/gocardless/{create-link,callback,institutions}`, `/api/banking/sync-status`, `/api/cron/sync-transactions`, `app/(dashboard)/layout.tsx`, settings bank cards, agent `list_bank_accounts` tool; uses `@polso/banking`, `@polso/cache`, `@polso/intelligence`, `features/counterparties`, `features/inbox`, `features/transactions`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
