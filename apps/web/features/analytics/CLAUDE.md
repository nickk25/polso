# features/analytics

Financial analytics and forecasting: burn rate, runway, cash flow, category/counterparty breakdowns, VAT summary — powers /reports and the /dashboard KPIs.

## Files

- `queries/get-analytics.ts` — `getBurnRateAndRunway`, `getMonthlySpendTrend`, `getCategoryBreakdown` / `getIncomeCategoryBreakdown`, `getTopCounterparties`, `getExpenseStatsForMonth`, `getCashFlow`, `getIncomeStats`, `getVATSummary` (fiscal quarters, IVA collected vs paid)
- `queries/get-forecasts.ts` — `getCashFlowForecast` (historical + projected months with running balance), `getRevenueForecast` (weighted avg, recurring vs one-time split, top clients), `getExpenseForecast` (fixed/variable, per-category, spike alerts); CV-based confidence scoring
- `lib/quarters.ts` — re-exports `getFiscalQuarters` / `getCurrentQuarterNumber` from `@polso/utils/quarters`
- `components/` — server cards (`CashFlowForecastCard`, `RevenueForecastCard`, `ExpenseForecastCard`) + client charts (`CashFlowChart`, `ForecastChart`, `MonthlySpendChart`, `IncomeTrendChart`, `MiniCashFlowChart`), `ProfitLossTable`, `VATSummaryCard`, `AnalyticsFilters` (URL params), `AnalyticsEmptyState`; barrel `index.ts` exports the cards + P&L + VAT

## Key flows

- Most queries accept an optional `organizationId` and fall back to `getAuthContext()` — the explicit param exists for cron/bot callers (agent tools, partner app patterns)
- All aggregations exclude `status: "excluded"` entries; burn rate = avg expenses over last 3 complete months; runway = total balance / burn
- Forecast fixed-expense floor = `max(3-month avg fixed, sum of monthly RecurringPattern expectedAmount × confidence)`
- Read-only feature: no actions/, no mutations

## Data & integration

- Models: Entry, Account, Category, Counterparty, RecurringPattern (reads only)
- i18n namespace: `analytics` (incl. `analytics.vat`)
- Used by / uses: `app/(dashboard)/reports/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, agent tools (`get_cash_flow`, `get_burn_and_runway`, `get_vat_summary`, forecasts…), `features/alerts` reimplements runway inline for cron; uses `@polso/utils/quarters`

> **Keep fresh:** update this file in the same commit as any change to this feature (enforced by /review and the pre-push hook).
