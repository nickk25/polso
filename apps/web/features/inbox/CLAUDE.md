# features/inbox

Document vault (receipts/invoices) and receipt↔transaction matching. Serves `/vault`. Lifecycle details: `docs/RECEIPT_MATCHING_FLOW.md`.

## Files

- `actions/vault-actions.ts` — `confirmMatchAction`, `rejectMatchAction`, `manualMatchAction`, `unmatchAction`, `archiveItemAction`, `deleteInboxItemAction`, `searchTransactionsForMatchAction`
- `queries/get-vault.ts` — `getVaultItems` (merges InboxItems with legacy TransactionDocuments in memory, paginates), `getVaultStats`
- `lib/match-after-sync.ts` — `matchAfterSync`: bidirectional two-phase matching of newly synced transactions vs pending InboxItems (`findBestMatches` from `@polso/matching`, in-memory claim sets prevent double-claims)
- `lib/match-notifications.ts` — `persistMatch`: thin wrapper around `persistMatchResult` from `@polso/inbox` (normalizes Decimal tax fields)
- `lib/run-inbox-matching.ts` — re-exports `runMatchingForItem` from `@polso/inbox` as `runMatchingForInboxItem`
- `components/` — `VaultTable` (status filters, pagination, row → sheet), `VaultItemSheet` (confirm/reject suggestion, manual match, unmatch, delete), `VaultTransactionPicker` (debounced search), `VaultUploadButton` (POST `/api/vault/upload`)

## Key flows

- Confirm/manual match (single $transaction): MatchSuggestion → confirmed, TransactionAttachment upsert, InboxItem → `done`, Entry → `verified`; copies `taxAmount`/`taxRate` from the receipt to the Entry only if the Entry has none
- Unmatch/delete revert the Entry to `pending` only when no other documents (legacy or attachments) remain on the transaction
- Reject sets the InboxItem to `no_match`; archive hides it from the vault (no transaction changes)
- `matchAfterSync` is called from `features/banking/lib/sync-core.ts` after each GoCardless sync; it reconsiders `suggested_match` items if a better transaction arrives
- `runMatchingForInboxItem` is called by the Telegram/WhatsApp webhooks and `features/agent` chat attachments after OCR

## Data & integration

- Models: InboxItem, MatchSuggestion, TransactionAttachment, TransactionDocument (legacy), Transaction, Entry
- i18n namespace: `vault`
- Used by / uses: `app/(dashboard)/vault/page.tsx`, `/api/vault/upload`, `features/banking`, `/api/webhooks/{telegram,whatsapp}`, `features/agent` (widget + `list-inbox-items` tool), `features/transactions` (`unmatchAction` in document list); uses `@polso/inbox`, `@polso/matching`, `@/lib/storage/r2`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
