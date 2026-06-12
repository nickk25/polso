# features/transactions

Advisor view of a client's bank transactions with entry editing (status, type, IVA, counterparty, notes) — serves `/clients/[clientId]/transactions`.

## Files

- `queries/get-client-transactions.ts` — paginated transaction list with filters (search, date range, receipt/IVA status, fixed/variable, amount min/max) plus monthly stats (`getClientTransactionStats`); flattens the related Entry onto each row.
- `queries/get-client-counterparties.ts` — client's counterparties for the assign dropdown.
- `actions/update-client-entry.ts` — updates one entry's status/counterparty/notes (validates counterparty belongs to the client).
- `actions/update-client-entry-tax.ts` — sets taxRate/taxAmount on one entry.
- `actions/bulk-update-client-entries.ts` — bulk status, entryType, and IVA updates by transaction IDs; bulk tax computes `taxAmount` from gross with `rate/(1+rate)`.
- `actions/get-transaction-invoices.ts` — attached receipts (InboxItems via TransactionAttachment) with `/api/inbox/<id>` download URLs.
- `components/` — `transaction-table.tsx` (table + detail Sheet: inline status/counterparty/notes/IVA editing, bulk-action dropdowns, receipt request via proactive feature, invoice viewer); `transaction-filters.tsx` (URL-param-driven filters); `transaction-pagination.tsx`.

## Key flows

- Every query/action verifies the active `PartnerClient` link (`partnerId = ctx.organizationId, clientId, status: "active"`) before touching client data; queries `notFound()`, actions return FORBIDDEN. `get-transaction-invoices` checks via `organization.partnerLinks.some`.
- Receipt filters reuse the shared `transactionDocumentedWhere` / `transactionNotDocumentedWhere` predicates from @polso/db.
- Amount-sign convention: positive = money out (expense), negative = money in; stats only sum positive amounts.
- Filters/pagination live in URL search params; mutations `revalidatePath('/clients/<id>/transactions')`.
- Bulk IVA presets in the table: sin IVA / 4% / 10% / 21%.

## Data & integration

- Models: Transaction, Entry, Counterparty, PartnerClient, InboxItem, TransactionAttachment, Account
- Used by / uses: `app/(dashboard)/clients/[clientId]/transactions/page.tsx`; `features/proactive` (`sendReceiptRequestAction`); packages `@polso/db`, `@polso/utils`, `@polso/ui`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
