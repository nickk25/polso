// Re-export Prisma types
export type {
  Organization,
  UserOrganization,
  Account,
  Transaction,
  Category,
  Vendor,
  Expense,
  Income,
  ExpenseInvoice,
  RecurringPattern,
  Alert,
  Export,
  UserPreference,
  NotificationSetting,
  Invitation,
} from "@/lib/generated/prisma/client"

// Action response type for server actions
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export function successResponse<T>(data: T): ActionResponse<T> {
  return { success: true, data }
}

export function errorResponse(error: string, code?: string): ActionResponse<never> {
  return { success: false, error, code }
}

// Plan types
export type PlanType = "free" | "pro" | "business"

// User roles
export type UserRole = "owner" | "admin" | "member"

// Expense types
export type ExpenseType = "fixed" | "variable"

// Expense status
export type ExpenseStatus = "pending" | "documented" | "excluded"

// Income source
export type IncomeSource = "salary" | "freelance" | "investment" | "refund" | "transfer" | "other"

// Income status
export type IncomeStatus = "pending" | "confirmed" | "excluded"

// Account status
export type AccountStatus = "pending" | "active" | "expired" | "error"

// Recurring frequency
export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

// Alert types
export type AlertType =
  | "low_balance"
  | "high_expense"
  | "missed_recurring"
  | "unusual_activity"
  | "runway_warning"
  | "budget_exceeded"

export type AlertSeverity = "info" | "warning" | "critical"

// Export status
export type ExportStatus = "pending" | "processing" | "completed" | "failed"

// Dashboard KPIs
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
