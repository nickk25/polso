import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendUp, TrendDown } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"
import type { CashFlowForecast } from "../queries/get-forecasts"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatConfidence(confidence: number): string {
  if (confidence >= 0.8) return "High"
  if (confidence >= 0.5) return "Medium"
  return "Low"
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500/10 text-green-600"
  if (confidence >= 0.5) return "bg-amber-500/10 text-amber-600"
  return "bg-red-500/10 text-red-600"
}

interface CashFlowForecastCardProps {
  forecast: CashFlowForecast
}

export async function CashFlowForecastCard({ forecast }: CashFlowForecastCardProps) {
  const t = await getTranslations("analytics")
  const { months, currency, currentBalance, assumptions } = forecast
  const forecastMonths = months.filter((m) => !m.isHistorical)
  const nextMonth = forecastMonths[0]

  // Get max value for chart scaling
  const allValues = months.flatMap((m) => [
    m.projectedIncome,
    m.projectedExpenses,
    Math.abs(m.projectedNet),
  ])
  const maxValue = Math.max(...allValues, 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("cashFlowForecast.title")}</CardTitle>
          {nextMonth && (
            <Badge variant="outline" className={getConfidenceColor(nextMonth.confidence)}>
              {t("confidence.label", { level: nextMonth.confidence >= 0.8 ? t("confidence.high") : nextMonth.confidence >= 0.5 ? t("confidence.medium") : t("confidence.low") })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {nextMonth && (
          <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b">
            <div>
              <p className="text-xs text-muted-foreground">{t("cashFlowForecast.projectedIncome")}</p>
              <p className="text-lg font-semibold text-green-600">
                +{formatCurrency(nextMonth.projectedIncome, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("cashFlowForecast.projectedExpenses")}</p>
              <p className="text-lg font-semibold text-red-500">
                -{formatCurrency(nextMonth.projectedExpenses, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("cashFlowForecast.netCashFlow")}</p>
              <p className={`text-lg font-semibold flex items-center justify-center gap-1 ${
                nextMonth.projectedNet >= 0 ? "text-green-600" : "text-red-500"
              }`}>
                {nextMonth.projectedNet >= 0 ? (
                  <TrendUp className="h-4 w-4" />
                ) : (
                  <TrendDown className="h-4 w-4" />
                )}
                {nextMonth.projectedNet >= 0 ? "+" : ""}
                {formatCurrency(nextMonth.projectedNet, currency)}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="space-y-2">
          <div className="flex h-[160px] gap-1">
            {months.map((month, idx) => {
              const incomeHeight = (month.projectedIncome / maxValue) * 100
              const expenseHeight = (month.projectedExpenses / maxValue) * 100

              return (
                <div
                  key={month.month}
                  className={`flex-1 flex flex-col items-center gap-1 ${
                    !month.isHistorical ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex-1 w-full flex items-end gap-0.5">
                    <div
                      className={`flex-1 rounded-t transition-all ${
                        month.isHistorical ? "bg-green-500" : "bg-green-500/50 border border-dashed border-green-500"
                      }`}
                      style={{ height: `${incomeHeight}%`, minHeight: incomeHeight > 0 ? "2px" : "0" }}
                      title={`Income: ${formatCurrency(month.projectedIncome, currency)}`}
                    />
                    <div
                      className={`flex-1 rounded-t transition-all ${
                        month.isHistorical ? "bg-red-400" : "bg-red-400/50 border border-dashed border-red-400"
                      }`}
                      style={{ height: `${expenseHeight}%`, minHeight: expenseHeight > 0 ? "2px" : "0" }}
                      title={`Expenses: ${formatCurrency(month.projectedExpenses, currency)}`}
                    />
                  </div>
                  <span className={`text-xs ${month.isHistorical ? "text-muted-foreground" : "text-primary font-medium"}`}>
                    {month.monthLabel}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-green-500" />
              <span className="text-muted-foreground">{t("cashFlowForecast.legendIncome")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-red-400" />
              <span className="text-muted-foreground">{t("cashFlowForecast.legendExpenses")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded border border-dashed border-primary" />
              <span className="text-muted-foreground">{t("cashFlowForecast.legendForecast")}</span>
            </div>
          </div>
        </div>

        {/* Projected Balance */}
        {forecastMonths.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("cashFlowForecast.projectedBalance", { count: forecastMonths.length })}
              </span>
              <span className="font-semibold">
                {formatCurrency(forecastMonths[forecastMonths.length - 1].projectedBalance, currency)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
