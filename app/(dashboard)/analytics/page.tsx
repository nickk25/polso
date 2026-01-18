import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartLine, ArrowRight, TrendUp, Binoculars } from "@phosphor-icons/react/dist/ssr"
import {
  getBurnRateAndRunway,
  getMonthlySpendTrend,
  getCategoryBreakdown,
  getTopVendors,
  getCashFlow,
} from "@/features/analytics/queries/get-analytics"
import {
  getCashFlowForecast,
  getRevenueForecast,
  getExpenseForecast,
} from "@/features/analytics/queries/get-forecasts"
import { getIncomeStats, getMonthlyIncomeTrend } from "@/features/income/queries/get-income"
import {
  CashFlowForecastCard,
  RevenueForecastCard,
  ExpenseForecastCard,
} from "@/features/analytics/components"
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

export default async function AnalyticsPage() {
  const [
    burnRate,
    monthlyTrend,
    categoryBreakdown,
    topVendors,
    cashFlow,
    incomeStats,
    incomeTrend,
    cashFlowForecast,
    revenueForecast,
    expenseForecast,
  ] = await Promise.all([
    getBurnRateAndRunway(),
    getMonthlySpendTrend(6),
    getCategoryBreakdown(),
    getTopVendors(5),
    getCashFlow(6),
    getIncomeStats(),
    getMonthlyIncomeTrend(6),
    getCashFlowForecast(3),
    getRevenueForecast(),
    getExpenseForecast(),
  ])

  const hasData =
    monthlyTrend.some((m) => m.total > 0) ||
    categoryBreakdown.length > 0 ||
    topVendors.length > 0 ||
    incomeStats.totalThisMonth > 0

  if (!hasData) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your financial data
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChartLine className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Analytics require data</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              Connect a bank account and import transactions to unlock detailed
              analytics
            </p>
            <Button className="mt-4" asChild>
              <Link href="/banking">
                Connect Bank Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currency = burnRate.currency

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Deep insights into your financial data
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(burnRate.totalBalance, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +{formatCurrency(incomeStats.totalThisMonth, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              -{formatCurrency(burnRate.burnRate, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${incomeStats.totalThisMonth - burnRate.burnRate >= 0 ? "text-green-500" : "text-red-500"}`}>
              {incomeStats.totalThisMonth - burnRate.burnRate >= 0 ? "+" : ""}{formatCurrency(incomeStats.totalThisMonth - burnRate.burnRate, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Runway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {burnRate.runway > 0 ? `${burnRate.runway.toFixed(1)} mo` : "∞"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Spend Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex h-[180px] items-end gap-2">
                {monthlyTrend.map((month) => {
                  const maxValue = Math.max(...monthlyTrend.map((m) => m.total))
                  const height = maxValue > 0 ? (month.total / maxValue) * 100 : 0
                  const fixedHeight =
                    month.total > 0 ? (month.fixed / month.total) * height : 0
                  const variableHeight = height - fixedHeight

                  return (
                    <div
                      key={month.month}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div className="flex-1 w-full flex flex-col justify-end">
                        <div
                          className="w-full bg-amber-500 rounded-t transition-all"
                          style={{ height: `${variableHeight}%` }}
                          title={`Variable: ${formatCurrency(month.variable, currency)}`}
                        />
                        <div
                          className="w-full bg-red-500 transition-all"
                          style={{ height: `${fixedHeight}%` }}
                          title={`Fixed: ${formatCurrency(month.fixed, currency)}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {month.month}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <span className="text-muted-foreground">Fixed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <span className="text-muted-foreground">Variable</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {categoryBreakdown.slice(0, 6).map((category) => (
                  <div key={category.categoryId || "uncategorized"} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <span>{category.categoryName}</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(category.total, currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
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
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No expenses this month
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex h-[180px] items-end gap-2">
                {cashFlow.map((month) => {
                  const maxValue = Math.max(
                    ...cashFlow.flatMap((d) => [d.inflow, d.outflow])
                  )
                  const inflowHeight =
                    maxValue > 0 ? (month.inflow / maxValue) * 100 : 0
                  const outflowHeight =
                    maxValue > 0 ? (month.outflow / maxValue) * 100 : 0

                  return (
                    <div
                      key={month.month}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
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
                      <span className="text-xs text-muted-foreground">
                        {month.month}
                      </span>
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
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            {topVendors.length > 0 ? (
              <div className="space-y-4">
                {topVendors.map((vendor, index) => (
                  <div key={vendor.vendorId || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[60%]">
                        {vendor.vendorName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {vendor.count}x
                        </span>
                        <span className="font-medium">
                          {formatCurrency(vendor.total, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${vendor.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No vendor data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Analytics Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeTrend.some((m) => m.total > 0) ? (
              <div className="space-y-4">
                {/* Bar chart */}
                <div className="flex h-[180px] items-end gap-2">
                  {incomeTrend.map((month) => {
                    const maxValue = Math.max(...incomeTrend.map((m) => m.total))
                    const height = maxValue > 0 ? (month.total / maxValue) * 100 : 0

                    return (
                      <div
                        key={month.month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="flex-1 w-full flex flex-col justify-end">
                          <div
                            className="w-full bg-green-500 rounded-t transition-all"
                            style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                            title={`${month.month}: ${formatCurrency(month.total, currency)}`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {month.month}
                        </span>
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
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No income data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeStats.bySource.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const sourceColors: Record<string, string> = {
                    salary: "#22c55e",
                    freelance: "#3b82f6",
                    investment: "#a855f7",
                    refund: "#f97316",
                    transfer: "#06b6d4",
                    other: "#6b7280",
                  }
                  const totalIncome = incomeStats.bySource.reduce((sum, s) => sum + s.total, 0)

                  return incomeStats.bySource.map((source) => {
                    const percentage = totalIncome > 0 ? (source.total / totalIncome) * 100 : 0
                    const color = sourceColors[source.source] || sourceColors.other

                    return (
                      <div key={source.source} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="capitalize">{source.source}</span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(source.total, currency)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  No income data this month
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecasts Section */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Binoculars className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Forecasts</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            AI-powered predictions
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <CashFlowForecastCard forecast={cashFlowForecast} />
          <RevenueForecastCard forecast={revenueForecast} currency={currency} />
          <ExpenseForecastCard forecast={expenseForecast} currency={currency} />
        </div>
      </div>
    </div>
  )
}
