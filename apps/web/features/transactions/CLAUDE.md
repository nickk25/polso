# features/transactions

Transaction (Entry) list with filters, inline/bulk editing, and document attachments — serves `/transactions`.

## Files

- `actions/update-transaction.ts` — `updateEntryAction(entryId, input)`: per-entry category/entryType/status/description/taxRate/taxAmount; validates category is system or org-owned
- `actions/bulk-update-transaction.ts` — `bulkUpdateEntryCategoryAction`, `bulkUpdateEntryTypeAction`, `bulkUpdateEntryStatusAction` (`updateMany` scoped to org)
- `actions/document-actions.ts` — `getTransactionDocumentsAction`: merges legacy `TransactionDocument` rows with inbox `TransactionAttachment`s into one list with signed R2 download URLs; `deleteTransactionDocumentAction`: deletes file + row, reverts entries to `pending` when no docs/attachments remain
- `queries/get-transactions.ts` — paginated `Entry` list with filters (direction, date range, category incl. `"none"`, status, search across description/merchantName/name, `noVat`); `getTransactionStats()` month-to-date income/expense sums; accepts an optional `organizationId` override
- `lib/backfill-core.ts` — `backfillCategoriesCore(orgId)`: two-pass backfill — seed counterparty `defaultCategoryId` from manual categorizations, then `suggestCategory` (`@polso/intelligence`) on uncategorized entries at confidence ≥ 0.7
- `components/` — `transaction-table.tsx` (canonical table pattern: checkbox selection, row click → edit Sheet calling `updateEntryAction`, document list/upload inside the Sheet), `transaction-filters.tsx` (URL-param filters, 300ms debounced search), `transaction-bulk-action-bar.tsx` (bulk category/type/status), `transaction-document-list.tsx` (preview/download/delete; unmatch via inbox `unmatchAction`), `transaction-document-upload.tsx` (uploads via `/api/transaction-documents/upload-url`), `transaction-empty-state.tsx` (sync now / connect bank), `transaction-tabs.tsx` (expenses/income links)

## Key flows

- Manual categorization (single or bulk) sets `categorySource: "manual"`, `categoryConfidence: 1` and propagates the category to the counterparty's `defaultCategoryId` for future auto-categorization
- Mutations revalidate `/transactions` + `/dashboard` (document delete also `/vault`)
- `backfillCategoriesCore` is invoked from `features/banking/lib/sync-core.ts` after bank syncs, not from this feature's UI
- Attached documents have two sources: legacy uploads (`TransactionDocument`) and vault matches (`TransactionAttachment` → `InboxItem`); the delete action only handles the legacy kind, vault items are unmatched instead

## Data & integration

- Models: Entry, Transaction, Category, Counterparty, TransactionDocument, TransactionAttachment, InboxItem
- i18n namespace: `transactions`
- Used by / uses: `app/(dashboard)/transactions/page.tsx`, agent `list-transactions` tool, `features/inbox` (vault-item-sheet), `features/banking` (sync-core); uses `features/inbox` actions, `@polso/intelligence`, R2 storage (`@/lib/storage/r2`)

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
