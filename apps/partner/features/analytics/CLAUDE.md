# features/analytics

Per-client P&L and VAT (Modelo 303) summaries rendered on the client detail page `/clients/[clientId]`.

## Files

- `queries/get-client-profit-loss.ts` — monthly inflow/outflow/net from `Entry` for the last N months (default 6), excluding `status: "excluded"`
- `queries/get-client-vat-summary.ts` — quarterly VAT collected/paid/net for a fiscal year from `Entry.taxAmount`, plus YTD totals; currency from the client's first active `Account` (fallback EUR)
- `components/` — `ClientPLTable` (monthly P&L table with totals row), `ClientVatCard` (quarterly VAT table T1–T4 + accumulated, highlights current quarter, empty state when no VAT data)

## Key flows

- Both queries verify the `PartnerClient` link (`partnerId`, `clientId`, `status: "active"`) first and call `notFound()` if missing — never query client data without it
- VAT direction split: `direction === "income"` → collected (IVA cobrado), otherwise paid (IVA soportado); quarters come from `@polso/utils/quarters` (`getFiscalQuarters`, `getCurrentQuarterNumber`)
- P&L direction split: `direction === "expense"` → outflow, everything else → inflow
- Components are presentation-only (no actions); all amounts formatted `es-ES`

## Data & integration

- Models: PartnerClient, Entry, Account
- Used by / uses: `app/(dashboard)/clients/[clientId]/page.tsx`; `@polso/utils/quarters`, `@polso/ui`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
