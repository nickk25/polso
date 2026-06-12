# features/matching

Receipt↔transaction conciliation for a client: list pending match suggestions, confirm/decline them (single or bulk), and re-run the matcher. Serves `/clients/[clientId]/inbox` (`/conciliation` redirects there).

## Files

- `actions/handle-suggestion.ts` — `confirmSuggestionAction` / `declineSuggestionAction` for a single suggestion
- `actions/bulk-confirm-suggestions.ts` — confirms many suggestions; each runs independently (`confirmOne`), returns count confirmed
- `actions/run-matching.ts` — `runMatchingAction`: retries OCR on `ocr_failed` items, then scores unmatched inbox items (`processing`/`no_match`, no transactionId) against all unattached expenses via `findBestMatches`, creating pending `MatchSuggestion`s (skips existing pairs)
- `queries/get-match-suggestions.ts` — pending suggestions with transaction + inbox item details, ordered by confidence desc
- `components/suggestion-list.tsx` — `SuggestionList`: cards with checkbox selection, "select all auto_matched" + bulk confirm bar, per-row `SuggestionActions`, invoice preview link to `/api/inbox/[id]`

## Key flows

- Every action and query verifies the active `PartnerClient` link first (actions return FORBIDDEN/NOT_FOUND, query calls `notFound()`)
- Confirm is a `$transaction`: suggestion → `confirmed`, `TransactionAttachment` upserted, inbox item → `done` + transactionId, entry → `verified`; it also copies `taxAmount`/`taxRate` from the inbox item OCR onto the entry only when the entry has none
- `run-matching` builds a full cross-product of inbox items × unattached expense transactions (amount > 0 = money out in Tink) with no date filter, aligning with the sync-time `matchAfterSync`
- Actions revalidate `/clients/[clientId]/inbox`, `/conciliation`, and the client detail page

## Data & integration

- Models: PartnerClient, MatchSuggestion, InboxItem, Transaction, TransactionAttachment, Entry
- Used by / uses: `app/(dashboard)/clients/[clientId]/inbox/page.tsx`, `components/matching/run-matching-button.tsx`, `components/matching/suggestion-actions.tsx`; `@polso/matching` (scoring), `@polso/inbox` (OCR retry), `@polso/storage`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
