export type UserRole = "owner" | "admin" | "member"

export type ExpenseType = "fixed" | "variable"

export type ExpenseStatus = "pending" | "documented" | "excluded"

export type IncomeSource = "salary" | "freelance" | "investment" | "refund" | "transfer" | "other"

export type IncomeStatus = "pending" | "confirmed" | "excluded"

export type AccountStatus = "pending" | "active" | "expired" | "error"

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

export type AlertType =
  | "low_balance"
  | "high_expense"
  | "missed_recurring"
  | "unusual_activity"
  | "runway_warning"
  | "budget_exceeded"

export type AlertSeverity = "info" | "warning" | "critical"

export type ExportStatus = "pending" | "processing" | "completed" | "failed"

export interface DashboardKPIs {
  currentBalance: number
  burnRate: number
  runway: number
  totalFixedExpenses: number
  totalVariableExpenses: number
  fixedVariableRatio: number
  monthOverMonthChange: number
  projectedCashFlow: number
}
