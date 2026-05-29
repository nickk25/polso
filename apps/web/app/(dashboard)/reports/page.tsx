import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { ChartLine, ArrowRight, Binoculars } from "@phosphor-icons/react/dist/ssr"
import {
  getBurnRateAndRunway,
  getMonthlySpendTrend,
  getCategoryBreakdown,
  getIncomeCategoryBreakdown,
  getTopVendors,
  getCashFlow,
  getExpenseStatsForMonth,
} from "@/features/analytics/queries/get-analytics"
import {
  getCashFlowForecast,
  getRevenueForecast,
  getExpenseForecast,
} from "@/features/analytics/queries/get-forecasts"
import { getIncomeStats } from "@/features/income/queries/get-income"
import {
  CashFlowForecastCard,
  RevenueForecastCard,
  ExpenseForecastCard,
} from "@/features/analytics/components"
import { MonthlySpendChart } from "@/features/analytics/components/monthly-spend-chart"
import { CashFlowChart } from "@/features/analytics/components/cash-flow-chart"
import { AnalyticsFilters } from "@/features/analytics/components/analytics-filters"
import Link from "next/link"
import { Button } from "@polso/ui/button"
import { format, startOfMonth, parse } from "date-fns"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const t = await getTranslations("analytics")
  const { month } = await searchParams

  const currentMonthStr = format(new Date(), "yyyy-MM")
  const selectedMonthStr = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthStr
  const selectedDate = startOfMonth(parse(selectedMonthStr, "yyyy-MM", new Date()))

  const [
    burnRate,
    monthlyTrend,
    categoryBreakdown,
    topVendors,
    cashFlow,
    incomeStats,
    incomeCategoryBreakdown,
    cashFlowForecast,
    revenueForecast,
    expenseForecast,
    expenseStats,
  ] = await Promise.all([
    getBurnRateAndRunway(),
    getMonthlySpendTrend(6, selectedDate),
    getCategoryBreakdown(selectedDate),
    getTopVendors(5, selectedDate),
    getCashFlow(6, selectedDate),
    getIncomeStats(selectedDate),
    getIncomeCategoryBreakdown(selectedDate),
    getCashFlowForecast(3),
    getRevenueForecast(),
    getExpenseForecast(),
    getExpenseStatsForMonth(selectedDate),
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
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChartLine className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("analyticsRequireData")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("analyticsRequireDataDescription")}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/settings/banking">
                {t("connectBankAccount")}
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <AnalyticsFilters selectedMonth={selectedMonthStr} />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalBalance")}
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
              {t("monthlyIncome")}
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
              {t("monthlyExpenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              -{formatCurrency(expenseStats.total, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("netCashFlow")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${incomeStats.totalThisMonth - expenseStats.total >= 0 ? "text-green-500" : "text-red-500"}`}>
              {incomeStats.totalThisMonth - expenseStats.total >= 0 ? "+" : ""}{formatCurrency(incomeStats.totalThisMonth - expenseStats.total, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("runway")}
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
        <Card>
          <CardHeader>
            <CardTitle>{t("monthlySpendTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlySpendChart data={monthlyTrend} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("expenseBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {categoryBreakdown.slice(0, 6).map((category) => (
                  <div key={category.categoryId || "uncategorized"} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.categoryColor }} />
                        <span>{category.categoryName}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(category.total, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${category.percentage}%`, backgroundColor: category.categoryColor }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{t("noExpensesThisMonth")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("cashFlow")}</CardTitle></CardHeader>
          <CardContent>
            <CashFlowChart data={cashFlow} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("topVendors")}</CardTitle></CardHeader>
          <CardContent>
            {topVendors.length > 0 ? (
              <div className="space-y-4">
                {topVendors.map((vendor, index) => (
                  <div key={vendor.vendorId || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[60%]">{vendor.vendorName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{vendor.count}x</span>
                        <span className="font-medium">{formatCurrency(vendor.total, currency)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${vendor.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{t("noVendorDataYet")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("incomeBreakdown")}</CardTitle></CardHeader>
          <CardContent>
            {incomeCategoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {incomeCategoryBreakdown.slice(0, 6).map((category) => (
                  <div key={category.categoryId || "uncategorized"} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.categoryColor }} />
                        <span>{category.categoryName}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(category.total, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${category.percentage}%`, backgroundColor: category.categoryColor }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{t("noIncomeDataThisMonth")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("incomeBySource")}</CardTitle></CardHeader>
          <CardContent>
            {incomeStats.bySource.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const sourceColors: Record<string, string> = {
                    salary: "#22c55e", freelance: "#3b82f6", investment: "#a855f7",
                    refund: "#f97316", transfer: "#06b6d4", other: "#6b7280",
                  }
                  const totalIncome = incomeStats.bySource.reduce((sum, s) => sum + s.total, 0)
                  return incomeStats.bySource.map((source) => {
                    const percentage = totalIncome > 0 ? (source.total / totalIncome) * 100 : 0
                    const color = sourceColors[source.source] || sourceColors.other
                    return (
                      <div key={source.source} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="capitalize">{source.source}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(source.total, currency)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{t("noIncomeDataThisMonth")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Binoculars className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("forecasts")}</h2>
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
