# features/counterparties

Counterparty (vendor/client) management: CRUD, merging, auto-detection during bank sync, and backfill from existing transactions. Serves `/counterparties`.

## Files

- `actions/manage-counterparty.ts` — `createCounterpartyAction`, `updateCounterpartyAction`, `deleteCounterpartyAction` (blocked if entries linked, `HAS_LINKED_ITEMS`), `mergeCounterpartiesAction` (thin wrapper: `getAuthContext` → `prisma.$transaction(mergeCounterpartiesCore)`), `getCounterpartyUsageAction`
- `lib/merge-counterparties-core.ts` — `mergeCounterpartiesCore(tx, {organizationId, sourceIds, targetId})`: session-free merge runnable in any transaction (and from the backfill migration script). Reassigns Entry + RecurringPattern + **DismissedPattern** to target, unions detection patterns, deletes sources
- `actions/backfill-counterparties.ts` — `backfillCounterpartiesAction`: groups expense entries lacking a counterparty by normalized `transaction.counterpartyName`, bulk-creates missing counterparties, links entries
- `queries/get-counterparties.ts` — `getCounterparties` / `getCounterpartyById` with stats (`totalSpent`, `lastEntryDate` via entry groupBy), `getOrgCurrency`
- `lib/counterparty-matcher.ts` — `findOrCreateCounterparty(org, rawName, type, {structured, iban, lookup})`: resolves identity via `canonicalize()` (`@polso/banking`). Returns `null` for generic/operation noise (transaction gets no counterparty). Match order: **gov key exact → IBAN-first → matchKey exact** (with the hard invariant that two rows with *differing non-null* IBANs never merge — the collision splits the key with an IBAN-tail suffix). Seeds `detectionPatterns` with clean brand tokens; upgrades `type` to `"both"`. `buildCounterpartyLookup` returns the in-batch cache keyed by dedup key
- `lib/merge-suggestions.ts` — `computeMergeSuggestions`: **SUGGEST-only** (never auto-applies). Plain token split of the clean `normalizedName` matchKey (no second normalization pass — that fixed the Apple+Zara false-merge), brand-anchored blocking (candidates must share ≥1 token), Jaccard ≥ 0.5, clique-based grouping (every member pairwise-similar → no greedy transitive over-merge), government rows excluded. Returns `confidence` (0–1) + `sharedTokens`. Identical keys are already auto-merged at ingestion, so this only fires on similar-but-distinct keys (e.g. `zara` vs `home zara`).
- `components/` — `CounterpartiesPageContent` orchestrates `CounterpartyTable` (search, checkbox selection, merge bar), `CounterpartyForm` (Sheet with `CategorySelect` + delete), `CounterpartyMergeDialog`, `CounterpartyMergeSuggestions` (amber banner — per-group confidence badge, shared-token hint, low-confidence dimmed, "Don't merge" dismissal persisted in `localStorage` key `polso:dismissed-merges`), `BackfillCounterpartiesButton`

## Key flows

- Names are deduped via `normalizeCounterpartyName` from `@polso/banking`; create/update reject normalized duplicates (`DUPLICATE_ERROR`)
- Merge runs in a transaction (`mergeCounterpartiesCore`): reassigns entries + recurring patterns + dismissed patterns to target, unions `detectionPatterns`, deletes sources; revalidates `/counterparties`, `/transactions`, `/recurring`
- `findOrCreateCounterparty` is called from `features/banking/lib/sync-core.ts` on every transaction sync — it returns `defaultCategoryId`/`defaultEntryType` used for auto-categorization
- Merge suggestions are computed client-side from the full list (`useMemo` in page content)

## Data & integration

- Models: Counterparty, Entry, RecurringPattern, Category, Organization (currency)
- i18n namespace: `counterparties`
- Used by / uses: `app/(dashboard)/counterparties/page.tsx`, `features/banking` (sync), `features/agent` (`list-counterparties`, `get-merge-suggestions` tools); uses `@polso/banking`, `@polso/matching`, `features/categories` (`CategorySelect`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
