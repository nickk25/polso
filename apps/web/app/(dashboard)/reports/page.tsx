import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Binoculars } from "@phosphor-icons/react/dist/ssr"
import { hasConnectedBank } from "@/features/banking/queries/get-accounts"
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state"
import {
  getBurnRateAndRunway,
  getMonthlySpendTrend,
  getCategoryBreakdown,
  getIncomeCategoryBreakdown,
  getTopCounterparties,
  getCashFlow,
  getExpenseStatsForMonth,
  getIncomeStats,
  getVATSummary,
} from "@/features/analytics/queries/get-analytics"
import {
  getCashFlowForecast,
  getRevenueForecast,
  getExpenseForecast,
} from "@/features/analytics/queries/get-forecasts"
import {
  CashFlowForecastCard,
  RevenueForecastCard,
  ExpenseForecastCard,
  ProfitLossTable,
  VATSummaryCard,
} from "@/features/analytics/components"
import { MonthlySpendChart } from "@/features/analytics/components/monthly-spend-chart"
import { CashFlowChart } from "@/features/analytics/components/cash-flow-chart"
import { AnalyticsFilters } from "@/features/analytics/components/analytics-filters"
import { format, startOfMonth, parse } from "date-fns"
import { formatCurrency } from "@/lib/format-currency"

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
    topCounterparties,
    cashFlow,
    incomeStats,
    incomeCategoryBreakdown,
    cashFlowForecast,
    revenueForecast,
    expenseForecast,
    expenseStats,
    connectedBank,
    vatSummary,
  ] = await Promise.all([
    getBurnRateAndRunway(),
    getMonthlySpendTrend(6, selectedDate),
    getCategoryBreakdown(selectedDate),
    getTopCounterparties(5, selectedDate),
    getCashFlow(6, selectedDate),
    getIncomeStats(selectedDate),
    getIncomeCategoryBreakdown(selectedDate),
    getCashFlowForecast(3),
    getRevenueForecast(),
    getExpenseForecast(),
    getExpenseStatsForMonth(selectedDate),
    hasConnectedBank(),
    getVATSummary(),
  ])

  const hasData =
    monthlyTrend.some((m) => m.total > 0) ||
    categoryBreakdown.length > 0 ||
    topCounterparties.length > 0 ||
    incomeStats.totalThisMonth > 0

  if (!hasData) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardContent className="p-0">
            <AnalyticsEmptyState hasConnectedBank={connectedBank} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const currency = burnRate.currency

  return (
    <div className="flex flex-col gap-6 p-6">
      <AnalyticsFilters selectedMonth={selectedMonthStr} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("totalBalance")}</p>
          <p className="text-xl font-bold">{formatCurrency(burnRate.totalBalance, currency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("monthlyIncome")}</p>
          <p className="text-xl font-bold text-green-500">+{formatCurrency(incomeStats.totalThisMonth, currency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("monthlyExpenses")}</p>
          <p className="text-xl font-bold text-red-500">-{formatCurrency(expenseStats.total, currency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("netCashFlow")}</p>
          <p className={`text-xl font-bold ${incomeStats.totalThisMonth - expenseStats.total >= 0 ? "text-green-500" : "text-red-500"}`}>
            {incomeStats.totalThisMonth - expenseStats.total >= 0 ? "+" : ""}
            {formatCurrency(incomeStats.totalThisMonth - expenseStats.total, currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">{t("runway")}</p>
          <p className="text-xl font-bold">{burnRate.runway > 0 ? `${burnRate.runway.toFixed(1)} mo` : "∞"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pl.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("pl.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <ProfitLossTable data={cashFlow} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <VATSummaryCard data={vatSummary} />
      </Card>

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
            {topCounterparties.length > 0 ? (
              <div className="space-y-4">
                {topCounterparties.map((cp, index) => (
                  <div key={cp.counterpartyId || index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[60%]">{cp.counterpartyName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{cp.count}x</span>
                        <span className="font-medium">{formatCurrency(cp.total, currency)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${cp.percentage}%` }} />
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
            {incomeStats.byCategory.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const totalIncome = incomeStats.byCategory.reduce((sum, c) => sum + c.total, 0)
                  return incomeStats.byCategory.map((cat) => {
                    const percentage = totalIncome > 0 ? (cat.total / totalIncome) * 100 : 0
                    return (
                      <div key={cat.categoryId ?? "uncategorized"} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize truncate max-w-[60%]">{cat.categoryName}</span>
                          <span className="font-medium">{formatCurrency(cat.total, currency)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${percentage}%` }} />
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
