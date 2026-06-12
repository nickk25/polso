# features/export

Accounting export for a client: ZIP with a CSV (standard, A3 or Sage format) plus renamed invoice attachments. Serves `/clients/[clientId]/export` via `app/api/export/route.ts`.

## Files

- `queries/get-exportable-data.ts` — flattens client transactions in a date range with entry (category, counterparty, tax, notes) and first attachment into `ExportableTransaction[]`
- `queries/get-client-exports.ts` — last 5 completed `Export` records for the client (legacy `csv:` filePaths or partner-generated R2 ZIPs, filtered by `generatedByOrgId`), with generator org name resolved
- `lib/csv-generator.ts` — `generateCsv()`: standard Spanish CSV (BOM, `es-ES` dates, comma decimals) or A3/Sage journal lines via `@polso/accounting` (`convertToJournalLines` + providers); re-exports `generateInvoiceFileName`
- `lib/zip-generator.ts` — `generateZip()`: in-memory ZIP (archiver, level 9) from `{name, content, folder?}` files

## Key flows

- Both queries verify the active `PartnerClient` link first and `notFound()` without it
- `app/api/export/route.ts` orchestrates: auth (partner orgs only) → `getExportableData` → CSV at ZIP root + attachments fetched from R2 into `facturas/` (missing files skipped, never fail the export) → streams ZIP, then fire-and-forget uploads to R2 and creates the `Export` record with `generatedByOrgId`
- CSV separator: query param `sep`, falling back to `Organization.csvSeparator` (default `;`); Sage always uses `,`
- Attachments are renamed with `generateInvoiceFileName(date, vendor, amount, ext)` so files match CSV rows

## Data & integration

- Models: PartnerClient, Transaction, Entry, Category, Counterparty, TransactionAttachment, InboxItem, Export, Organization
- Used by / uses: `app/api/export/route.ts`, `app/(dashboard)/clients/[clientId]/page.tsx` (export history), `components/export/export-form.tsx`; `@polso/accounting`, `@polso/storage`, `@polso/utils/export`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
