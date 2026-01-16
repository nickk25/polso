import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Wallet,
  TrendDown,
  Clock,
  Receipt,
  ArrowDown,
  ArrowUp,
} from "@phosphor-icons/react/dist/ssr"
import { getAccountsSummary } from "@/features/banking/queries/get-accounts"
import { getExpenseStats } from "@/features/expenses/queries/get-expenses"
import { getBurnRateAndRunway, getCashFlow } from "@/features/analytics/queries/get-analytics"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function DashboardPage() {
  const [accountsSummary, expenseStats, burnRateData, cashFlow] = await Promise.all([
    getAccountsSummary(),
    getExpenseStats(),
    getBurnRateAndRunway(),
    getCashFlow(6),
  ])

  const currency = accountsSummary.currency || "USD"
  const totalExpenses = expenseStats.totalThisMonth
  const fixedExpenses = expenseStats.fixedThisMonth
  const variableExpenses = expenseStats.variableThisMonth
  const fixedPercent = totalExpenses > 0 ? (fixedExpenses / totalExpenses) * 100 : 0
  const variablePercent = totalExpenses > 0 ? (variableExpenses / totalExpenses) * 100 : 0

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

      {/* Fixed vs Variable Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlow.length > 0 && cashFlow.some((d) => d.inflow > 0 || d.outflow > 0) ? (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex h-[200px] items-end gap-2">
                {cashFlow.map((month) => {
                  const maxValue = Math.max(
                    ...cashFlow.flatMap((d) => [d.inflow, d.outflow])
                  )
                  const inflowHeight = maxValue > 0 ? (month.inflow / maxValue) * 100 : 0
                  const outflowHeight = maxValue > 0 ? (month.outflow / maxValue) * 100 : 0

                  return (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex-1 w-full flex items-end gap-0.5">
                        <div
                          className="flex-1 bg-green-500 rounded-t transition-all"
                          style={{ height: `${inflowHeight}%` }}
                          title={`Income: ${formatCurrency(month.inflow, currency)}`}
                        />
                        <div
                          className="flex-1 bg-red-400 rounded-t transition-all"
                          style={{ height: `${outflowHeight}%` }}
                          title={`Expenses: ${formatCurrency(month.outflow, currency)}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{month.month}</span>
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <span className="text-muted-foreground">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-400" />
                  <span className="text-muted-foreground">Expenses</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                No transaction data yet. Connect a bank account to see cash flow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
