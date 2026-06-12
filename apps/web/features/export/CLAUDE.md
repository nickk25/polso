# features/export

Expense export as a ZIP (CSV + PDF summary + `facturas/` folder with invoice files), stored in R2 with history. Serves `/export`.

## Files

- `actions/create-export.ts` — `createExportAction` (full pipeline, see flows), `getExportPreviewAction` (counts/totals before generating), `deleteExportAction` (removes R2 file + record)
- `queries/get-exports.ts` — `getExports` (history list), `getExportById`, `getExpensesForExport` (expense entries with counterparty/category/documents via transaction), `getExportPreview` (totals, fixed/variable split, category breakdown)
- `lib/csv-generator.ts` — `generateCSV` in `standard` (Spanish headers, `;` separator, BOM, comma decimals) or `a3`/`sage` accounting formats via `@polso/accounting`; `generateExportFileName`; re-exports `generateInvoiceFileName` from `@polso/utils/export`
- `lib/pdf-generator.ts` — `generatePDF`: pdf-lib A4 report in Spanish (summary, category breakdown, stats, expense table, paged footer)
- `lib/zip-generator.ts` — `generateZip` (archiver, buffers) + `generateZipFromStreams` (unused by the action)
- `components/` — `NewExportButton` → `ExportDialog` (quarter/month/custom period, CSV separator, format select, live preview, download link); `ExportHistory` table (download via `/api/exports/[id]`, delete)

## Key flows

- `createExportAction`: creates Export record with `status: "processing"` → fetches expenses (fails with `NO_DATA` if empty) → builds CSV/PDF/invoice files (invoices fetched from R2, skipped individually on fetch failure) → zips → `uploadExport` to R2 → marks `completed` (or `failed` with `errorMessage` on any throw)
- Dates are normalized to UTC day start/end to avoid timezone boundary issues
- Re-downloads go through `/api/exports/[id]` (route queries prisma + R2 directly, not this feature)
- Mutations revalidate `/export`

## Data & integration

- Models: Export, Entry, Organization, Transaction (documents relation)
- i18n namespace: `export`
- Used by / uses: `app/(dashboard)/export/page.tsx`, `/api/exports/[id]`; uses `@polso/accounting`, `@polso/utils/export`, `@/lib/storage/r2`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
