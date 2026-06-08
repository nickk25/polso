# Accounting Export — Pending Work

State as of 2026-06-08. Fases 1–4 are done and merged to `main`.

---

## Done

| Fase | What |
|------|------|
| 1 | Schema: `Category.accountCode`, `Export.format` |
| 2 | `@polso/accounting` package — types, double-entry engine, A3 + Sage providers |
| 3 | Web + partner export wired to providers; format selector in both UIs |
| 4 | Editable `accountCode` on custom categories; system categories show PGC code inline |

---

## Pending

### V — Smoke-test real CSV import
**What:** Take a generated A3 CSV and a Sage CSV into actual software and confirm they import.
**How:**
- A3con: load CSV via "Importador de Asientos" add-on. Columns must match `FECHA,ID_ASIENTO,CUENTA,…` header exactly, `;` separator, UTF-8 BOM.
- Sage 50: load via "Importación de Asientos". Columns: `NumeroAsiento,Fecha,…`, `,` separator.
- Check: no import errors, amounts balance per `ID_ASIENTO`, dates parse correctly.
**Status:** manual, out-of-band. Not blocking but must be done before customer rollout.

---

### VI — Golden file test
**What:** Snapshot test for the CSV generators so format regressions are caught automatically.
**File:** `packages/accounting/__tests__/golden/a3-basic.csv` and `sage-basic.csv`
**How:** Use Vitest/Jest `toMatchSnapshot()` or a literal file comparison. Seed with 3 fixed entries (different categories, known amounts, 21% VAT on one) and assert the exact CSV output matches the golden file.
**Why:** The double-entry logic is easy to accidentally break. A golden file fails loudly if output changes.

---

### VII — Fix documentRef
**What:** `documentRef` in both apps is currently wrong.
- `apps/web`: uses the entry CUID (not an invoice number)
- `apps/partner`: uses the R2 file path (not an invoice number)

A3 and Sage use `documentRef` / `Documento` to cross-reference the original invoice in their archive.

**Fix:** Use `entry.id` as a stable, short reference (it's already a CUID — trimmed or hashed to 12 chars is fine). Optionally prefix: `EXP-{entry.id.slice(-8)}`.
**Files:**
- `apps/web/features/export/lib/csv-generator.ts` — `toMappedTransaction()`, `documentRef` field
- `apps/partner/features/export/lib/csv-generator.ts` — same

---

### VIII — OCR → capture invoice metadata
**What:** When a receipt/invoice is processed via OCR (inbox), extract:
- `invoiceNumber` — the supplier's invoice number (e.g., `FAC-2025-001`)
- Supplier NIF/CIF — to populate `counterparty.taxId` automatically

**Why:** A3 and Sage SII-mode require invoice numbers + NIF. Currently these fields are blank on most exports.

**How:**
1. Add `invoiceNumber String?` field to `Entry` model (or store on `InboxItem`).
2. In the OCR extraction prompt (`packages/agent/src/ocr/`), extract `invoiceNumber` and `supplierTaxId`.
3. When an `InboxItem` is matched to an `Entry`, write these back:
   - `entry.invoiceNumber = extracted.invoiceNumber`
   - If `entry.counterparty.taxId` is null, update it with `extracted.supplierTaxId`
4. In `toMappedTransaction()`, use `entry.invoiceNumber` as `documentRef` (falling back to `entry.id`).

**Schema change needed:** `Entry.invoiceNumber String?`

---

### IX — Holded provider
**What:** Add a third accounting provider: Holded (Spanish cloud ERP, common in startups).
**Pattern:** Same as A3/Sage — implement `AccountingProvider` in `packages/accounting/src/providers/holded.ts`.
**Holded import format:** Their CSV import for "Apuntes contables" uses a slightly different column order. Check current Holded docs before implementing.
**UI change:** Add `<SelectItem value="holded">Holded</SelectItem>` in both export dialogs.
**Note:** Holded also has a REST API (v1). Once the CSV provider works, a direct API integration (OAuth) would be a much better UX — but that's a larger sprint.

---

### X — SII compliance (future, >6M€ clients)
**What:** Spain's Suministro Inmediato de Información (SII) requires real-time VAT reporting for companies with >6M€ revenue.
**Scope:** Out of scope for the current advisory market (SMBs < 6M€). Flag per org when/if relevant.
**What it would need:** A proper AEAT web service integration, digital certificate auth (FNMT), XML schema for `SuministroLR`. Not a CSV export problem.

---

## Known limitations (document for users)

1. **System category codes are global** — the 14 system categories have shared PGC codes. Orgs that need a different code must create a custom category with the correct `accountCode`.
2. **NIF missing on many counterparties** — auto-detected counterparties don't have `taxId`. A3/Sage can import without NIF for simple journal entries, but NIF is required for SII-linked entries. Advisors should fill in NIF manually via the counterparty form.
3. **Income entries not exported** — the current export only covers `direction: "expense"`. The income double-entry path exists in `@polso/accounting/double-entry.ts` but no query feeds it yet.
4. **Sage separator is hardcoded to `,`** — the Sage 50c official importer expects comma. The `;` option in the UI only affects the standard Polso CSV.
