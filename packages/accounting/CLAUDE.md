# packages/accounting — @polso/accounting

Spanish double-entry bookkeeping engine. Converts transactions into PGC (Plan General Contable) journal lines and generates import files for accounting software (A3con, Sage 50).

## What it exports

```typescript
// Double-entry conversion
convertToJournalLines(transactions: MappedTransaction[], categorySlugMap?: Record<string, string>) // → JournalLine[]

// PGC account resolution
resolveAccountCode(categoryAccountCode, categorySlug?) // → string (accountCode > PGC_DEFAULTS[slug] > "629")
PGC_DEFAULTS    // Record<string, string> — category slug → PGC account code
PGC_BANK        // "572" Bancos
PGC_VAT_INPUT   // "472" IVA soportado
PGC_VAT_OUTPUT  // "477" IVA repercutido
PGC_INCOME      // "705" Ingresos

// Export providers
a3Provider    // AccountingProvider — id: "a3", name: "A3con", default separator ";"
sageProvider  // AccountingProvider — id: "sage", name: "Sage 50", default separator ","
provider.generate(lines: JournalLine[], { separator }) // → string (CSV with UTF-8 BOM, CRLF line endings)

// Types
MappedTransaction   // normalized input: amount, direction ("expense" | "income"), tax fields, counterparty
JournalLine         // one debit/credit line: journalId, account, counterAccount, taxBase/taxRate/taxAmount
AccountingProvider  // { id: "a3" | "sage", name, generate() }
```

## Key concepts

**Journal entry shape:** Each transaction becomes one balanced asiento (`journalId` increments per transaction):
- Expense: expense account DEBE (base) + 472 IVA soportado DEBE (if `taxAmount > 0`) + 572 Bancos HABER (full amount)
- Income: 572 Bancos DEBE (full amount) + 705 Ingresos HABER (base) + 477 IVA repercutido HABER (if `taxAmount > 0`)

**Balance validation:** Every asiento is validated — if total DEBE ≠ total HABER (beyond 0.005 epsilon), `convertToJournalLines` throws `Asiento descuadrado para tx {id}`.

**Tax base:** `base = amount - taxAmount` when both `taxAmount` and `taxRate` are set; otherwise the full amount.

**Account resolution priority:** `Category.accountCode` from the DB > `PGC_DEFAULTS[slug]` fallback (slugs match `seed.ts`) > `"629"` (Otros servicios).

**CSV format:** Both providers emit UTF-8 BOM, CRLF line endings, dates as `YYYYMMDD`, amounts as `n.toFixed(2)`, tax rate as integer percent. Column orders differ (A3: `FECHA;ID_ASIENTO;...`, Sage: `NumeroAsiento,Fecha,...`).

**Descriptions:** truncated to 30 chars, prefer `counterpartyName` over `description`. `documentRef` falls back to the first 10 chars of the transaction id.

## Integration points

- `apps/web/features/export/lib/csv-generator.ts` — maps `EntryForExport` → `MappedTransaction`, generates A3/Sage exports when `ExportFormat` is `"a3"` or `"sage"`
- `apps/partner/features/export/lib/csv-generator.ts` — same flow for the advisor dashboard (`ExportableTransaction` input)

## Dependencies

`@polso/utils` (`escapeCsv` from `@polso/utils/export`). No environment variables, no build step (raw TypeScript, `tsc --noEmit` for lint/build).
