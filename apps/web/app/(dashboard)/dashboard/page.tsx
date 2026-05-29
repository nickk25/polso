import {
  Wallet,
  TrendDown,
  TrendUp,
  Clock,
  Receipt,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Bank,
  Warning,
  Bell,
  UploadSimple,
  Export,
} from "@phosphor-icons/react/dist/ssr"
import { neonAuth } from "@neondatabase/auth/next/server"
import { getAccountsSummary, getAccounts } from "@/features/banking/queries/get-accounts"
import { getExpenseStats, getRecentExpenses } from "@/features/expenses/queries/get-expenses"
import { getIncomeStats, getRecentIncomes } from "@/features/income/queries/get-income"
import { getBurnRateAndRunway, getCategoryBreakdown } from "@/features/analytics/queries/get-analytics"
import { getAlerts } from "@/features/alerts/queries/get-alerts"
import { ChatInput } from "@/features/overview/components/chat-input"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyFull(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const first = name.split(" ")[0]
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 18) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

const SEVERITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "outline",
  info: "secondary",
}

export default async function DashboardPage() {
  const { user } = await neonAuth()
  const userName = user?.name ?? user?.email?.split("@")[0] ?? "there"

  const [accountsSummary, accounts, expenseStats, incomeStats, burnRateData, recentExpenses, recentIncomes, categoryBreakdown, alertsResult] = await Promise.all([
    getAccountsSummary(),
    getAccounts(),
    getExpenseStats(),
    getIncomeStats(),
    getBurnRateAndRunway(),
    getRecentExpenses(5),
    getRecentIncomes(3),
    getCategoryBreakdown(),
    getAlerts({ isRead: false }, 1, 5),
  ])

  const currency = accountsSummary.currency || "EUR"
  const activeAccounts = accounts.filter((a) => a.status !== "disconnected")
  const totalExpenses = expenseStats.totalThisMonth
  const totalIncome = incomeStats.totalThisMonth
  const netCashFlow = totalIncome - totalExpenses
  const unreadAlerts = alertsResult.alerts

  return (
    <div className="flex flex-col gap-8 p-6">

      {/* Hero section */}
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">{getGreeting(userName)}</h1>
          <p className="mt-1 text-muted-foreground">
            {accountsSummary.accountCount > 0
              ? `Your cash balance sits at ${formatCurrency(accountsSummary.totalCurrent, currency)} across ${accountsSummary.accountCount} ${accountsSummary.accountCount === 1 ? "account" : "accounts"}.`
              : "Connect a bank account to get started."}
          </p>
        </div>

        <ChatInput />

        {/* Quick actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href="/settings/banking">
              <Bank className="h-3.5 w-3.5" />
              Connect Bank
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href="/vault">
              <UploadSimple className="h-3.5 w-3.5" />
              Upload Receipt
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href="/export">
              <Export className="h-3.5 w-3.5" />
              Export
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountsSummary.totalCurrent, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accountsSummary.accountCount === 0
                ? "No accounts connected"
                : `${accountsSummary.accountCount} ${accountsSummary.accountCount === 1 ? "account" : "accounts"}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This month — Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              -{formatCurrency(totalExpenses, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseStats.expenseCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This month — Income</CardTitle>
            <TrendUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +{formatCurrency(totalIncome, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {incomeStats.incomeCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runway</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {burnRateData.runway > 0 ? burnRateData.runway.toFixed(1) : "∞"}
              <span className="text-sm font-normal text-muted-foreground"> mo</span>
            </div>
            <p className="text-xs text-muted-foreground">at current burn rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent transactions */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/transactions">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {recentExpenses.length > 0 || recentIncomes.length > 0 ? (
              <div className="space-y-3">
                {recentIncomes.map((income) => (
                  <div key={`income-${income.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-green-500/10 text-green-500">
                        <TrendUp className="h-4 w-4" weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {income.transaction?.merchantName || income.transaction?.name || income.description || "Income"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(income.date), "MMM d")} · <span className="capitalize">{income.source}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0 ml-2 text-green-500">
                      +{formatCurrencyFull(income.amount, income.currency)}
                    </span>
                  </div>
                ))}
                {recentExpenses.map((expense) => (
                  <div key={`expense-${expense.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: expense.category?.color ? `${expense.category.color}20` : "var(--muted)",
                          color: expense.category?.color || "var(--muted-foreground)",
                        }}
                      >
                        {(expense.vendor?.name || expense.transaction?.merchantName || expense.description || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {expense.vendor?.name || expense.transaction?.merchantName || expense.transaction?.name || expense.description || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), "MMM d")}
                          {expense.category && ` · ${expense.category.name}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0 ml-2 text-red-500">
                      -{formatCurrencyFull(expense.amount, expense.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/settings/banking">Connect Bank</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top categories + Connected accounts */}
        <div className="flex flex-col gap-4">
          {/* Top Spending Categories */}
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href="/reports">
                  Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {categoryBreakdown.slice(0, 5).map((category) => (
                    <div key={category.categoryId || "uncategorized"} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.categoryColor }} />
                          <span className="truncate">{category.categoryName}</span>
                        </div>
                        <span className="font-medium shrink-0 ml-2">
                          {formatCurrency(category.total, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${category.percentage}%`, backgroundColor: category.categoryColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  No expenses this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href="/settings/banking">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeAccounts.length > 0 ? (
                <div className="space-y-3">
                  {activeAccounts.slice(0, 3).map((account) => (
                    <div key={account.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {account.institutionLogo ? (
                          <img
                            src={account.institutionLogo.startsWith("data:") ? account.institutionLogo : `data:image/png;base64,${account.institutionLogo}`}
                            alt=""
                            className="h-5 w-5 rounded shrink-0"
                          />
                        ) : (
                          <Bank className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate font-medium">
                          {account.name}
                          {account.mask && <span className="text-muted-foreground font-normal"> ••{account.mask}</span>}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {formatCurrency(account.balanceCurrent || 0, account.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/settings/banking">
                    <Bank className="mr-2 h-4 w-4" />
                    Connect your first account
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts section */}
      {unreadAlerts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <h2 className="text-base font-semibold">Alerts</h2>
              <Badge variant="secondary" className="text-xs">{unreadAlerts.length} unread</Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/alerts">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unreadAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border bg-card p-4 flex items-start gap-3"
              >
                <Warning
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    alert.severity === "critical" ? "text-red-500"
                    : alert.severity === "warning" ? "text-amber-500"
                    : "text-blue-500"
                  }`}
                  weight="fill"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "outline"} className="text-[10px]">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
