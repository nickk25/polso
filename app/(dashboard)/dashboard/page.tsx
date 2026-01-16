import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Wallet,
  TrendDown,
  Clock,
  Receipt,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Bank,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr"
import { getAccountsSummary, getAccounts } from "@/features/banking/queries/get-accounts"
import { getExpenseStats, getRecentExpenses } from "@/features/expenses/queries/get-expenses"
import { getBurnRateAndRunway, getCashFlow, getCategoryBreakdown } from "@/features/analytics/queries/get-analytics"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function DashboardPage() {
  const [accountsSummary, accounts, expenseStats, burnRateData, cashFlow, recentExpenses, categoryBreakdown] = await Promise.all([
    getAccountsSummary(),
    getAccounts(),
    getExpenseStats(),
    getBurnRateAndRunway(),
    getCashFlow(6),
    getRecentExpenses(8),
    getCategoryBreakdown(),
  ])

  const currency = accountsSummary.currency || "USD"
  const totalExpenses = expenseStats.totalThisMonth
  const fixedExpenses = expenseStats.fixedThisMonth
  const variableExpenses = expenseStats.variableThisMonth
  const fixedPercent = totalExpenses > 0 ? (fixedExpenses / totalExpenses) * 100 : 0
  const variablePercent = totalExpenses > 0 ? (variableExpenses / totalExpenses) * 100 : 0
  const hasCashFlowData = cashFlow.length > 0 && cashFlow.some((d) => d.inflow > 0 || d.outflow > 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground">
          Financial overview and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountsSummary.totalCurrent, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accountsSummary.accountCount === 0
                ? "No accounts connected"
                : `Across ${accountsSummary.accountCount} account${accountsSummary.accountCount > 1 ? "s" : ""}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burn Rate</CardTitle>
            <TrendDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(burnRateData.burnRate, currency)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Average monthly spend (3mo)
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
              <span className="text-sm font-normal text-muted-foreground"> months</span>
            </div>
            <p className="text-xs text-muted-foreground">
              At current burn rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseStats.expenseCount} transactions this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed, Variable & Cash Flow Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixed Expenses</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(fixedExpenses, currency)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${fixedPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {fixedPercent.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variable Expenses</CardTitle>
            <ArrowUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(variableExpenses, currency)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${variablePercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {variablePercent.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact Cash Flow */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow (6mo)</CardTitle>
          </CardHeader>
          <CardContent>
            {hasCashFlowData ? (
              <div className="space-y-2">
                <div className="flex h-[60px] items-end gap-1">
                  {cashFlow.map((month) => {
                    const maxValue = Math.max(...cashFlow.flatMap((d) => [d.inflow, d.outflow]))
                    const inflowHeight = maxValue > 0 ? (month.inflow / maxValue) * 100 : 0
                    const outflowHeight = maxValue > 0 ? (month.outflow / maxValue) * 100 : 0
                    return (
                      <div key={month.month} className="flex-1 flex items-end gap-0.5">
                        <div
                          className="flex-1 bg-green-500 rounded-t transition-all"
                          style={{ height: `${inflowHeight}%`, minHeight: inflowHeight > 0 ? '2px' : '0' }}
                        />
                        <div
                          className="flex-1 bg-red-400 rounded-t transition-all"
                          style={{ height: `${outflowHeight}%`, minHeight: outflowHeight > 0 ? '2px' : '0' }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  {cashFlow.map((m) => (
                    <span key={m.month}>{m.month}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[76px] items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two Big Blocks: Recent Transactions & Top Categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: expense.category?.color ? `${expense.category.color}20` : 'var(--muted)',
                          color: expense.category?.color || 'var(--muted-foreground)'
                        }}
                      >
                        {(expense.vendor?.name || expense.transaction?.merchantName || expense.description || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">
                          {expense.vendor?.name ||
                            expense.transaction?.merchantName ||
                            expense.transaction?.name ||
                            expense.description ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), "MMM d")}
                          {expense.category && ` · ${expense.category.name}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0 ml-2">
                      {formatCurrencyCompact(expense.amount, expense.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/banking">Connect bank</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts & Top Categories */}
        <div className="flex flex-col gap-4">
          {/* Connected Accounts Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/banking">
                  Manage
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.slice(0, 3).map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {account.institutionLogo ? (
                          <img
                            src={account.institutionLogo.startsWith("data:") ? account.institutionLogo : `data:image/png;base64,${account.institutionLogo}`}
                            alt=""
                            className="h-6 w-6 rounded shrink-0"
                          />
                        ) : (
                          <Bank className="h-6 w-6 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.institutionName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {account.status === "active" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                        ) : account.status === "error" ? (
                          <Warning className="h-4 w-4 text-red-500" weight="fill" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" weight="fill" />
                        )}
                        <span className="text-sm font-medium">
                          {formatCurrency(account.balanceCurrent || 0, account.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {accounts.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{accounts.length - 3} more account{accounts.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/banking">
                      <Bank className="mr-2 h-4 w-4" />
                      Connect your first account
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Spending Categories */}
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Categories (This Month)</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">
                  Details
                  <ArrowRight className="ml-1 h-4 w-4" />
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
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.categoryColor }}
                          />
                          <span className="truncate">{category.categoryName}</span>
                        </div>
                        <span className="font-medium shrink-0 ml-2">
                          {formatCurrency(category.total, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: category.categoryColor,
                          }}
                        />
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
        </div>
      </div>
    </div>
  )
}
