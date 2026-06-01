import { listTransactions } from "./list-transactions"
import { getTransaction } from "./get-transaction"
import { listCategories } from "./list-categories"
import { listCounterparties } from "./list-counterparties"
import { getMergeSuggestions } from "./get-merge-suggestions"
import { listRecurringPatterns } from "./list-recurring-patterns"
import { listAlerts } from "./list-alerts"
import { listInboxItems } from "./list-inbox-items"
import { listBankAccounts } from "./list-bank-accounts"
import { getCashFlowTool } from "./get-cash-flow"
import { getCashFlowForecastTool } from "./get-cash-flow-forecast"
import { getRevenueForecastTool } from "./get-revenue-forecast"
import { getExpenseForecastTool } from "./get-expense-forecast"
import { getCategoryBreakdownTool } from "./get-category-breakdown"
import { getBurnAndRunway } from "./get-burn-and-runway"
import { getTopCounterpartiesTool } from "./get-top-counterparties"
import { getVATSummaryTool } from "./get-vat-summary"

export function buildTools() {
  return {
    list_transactions: listTransactions,
    get_transaction: getTransaction,
    list_categories: listCategories,
    list_counterparties: listCounterparties,
    get_merge_suggestions: getMergeSuggestions,
    list_recurring_patterns: listRecurringPatterns,
    list_alerts: listAlerts,
    list_inbox_items: listInboxItems,
    list_bank_accounts: listBankAccounts,
    get_cash_flow: getCashFlowTool,
    get_cash_flow_forecast: getCashFlowForecastTool,
    get_revenue_forecast: getRevenueForecastTool,
    get_expense_forecast: getExpenseForecastTool,
    get_category_breakdown: getCategoryBreakdownTool,
    get_burn_and_runway: getBurnAndRunway,
    get_top_counterparties: getTopCounterpartiesTool,
    get_vat_summary: getVATSummaryTool,
  }
}
