# features/counterparties

Counterparty (vendor/client) management: CRUD, merging, auto-detection during bank sync, and backfill from existing transactions. Serves `/counterparties`.

## Files

- `actions/manage-counterparty.ts` — `createCounterpartyAction`, `updateCounterpartyAction`, `deleteCounterpartyAction` (blocked if entries linked, `HAS_LINKED_ITEMS`), `mergeCounterpartiesAction`, `getCounterpartyUsageAction`
- `actions/backfill-counterparties.ts` — `backfillCounterpartiesAction`: groups expense entries lacking a counterparty by normalized `transaction.counterpartyName`, bulk-creates missing counterparties, links entries
- `queries/get-counterparties.ts` — `getCounterparties` / `getCounterpartyById` with stats (`totalSpent`, `lastEntryDate` via entry groupBy), `getOrgCurrency`
- `lib/counterparty-matcher.ts` — `findOrCreateCounterparty` (exact normalized match → detection-pattern substring match → create; upgrades `type` to `"both"` when seen on both sides), `buildCounterpartyLookup`
- `lib/merge-suggestions.ts` — `computeMergeSuggestions`: groups similar names via Jaccard similarity ≥ 0.3 on tokens (`@polso/matching`)
- `components/` — `CounterpartiesPageContent` orchestrates `CounterpartyTable` (search, checkbox selection, merge bar), `CounterpartyForm` (Sheet with `CategorySelect` + delete), `CounterpartyMergeDialog`, `CounterpartyMergeSuggestions` (amber banner), `BackfillCounterpartiesButton`

## Key flows

- Names are deduped via `normalizeCounterpartyName` from `@polso/banking`; create/update reject normalized duplicates (`DUPLICATE_ERROR`)
- Merge runs in a transaction: reassigns entries + recurring patterns to target, unions `detectionPatterns`, deletes sources; revalidates `/counterparties`, `/transactions`, `/recurring`
- `findOrCreateCounterparty` is called from `features/banking/lib/sync-core.ts` on every transaction sync — it returns `defaultCategoryId`/`defaultEntryType` used for auto-categorization
- Merge suggestions are computed client-side from the full list (`useMemo` in page content)

## Data & integration

- Models: Counterparty, Entry, RecurringPattern, Category, Organization (currency)
- i18n namespace: `counterparties`
- Used by / uses: `app/(dashboard)/counterparties/page.tsx`, `features/banking` (sync), `features/agent` (`list-counterparties`, `get-merge-suggestions` tools); uses `@polso/banking`, `@polso/matching`, `features/categories` (`CategorySelect`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
