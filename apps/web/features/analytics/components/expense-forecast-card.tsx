import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import { Warning } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"
import type { ExpenseForecast } from "../queries/get-forecasts"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500/10 text-green-600"
  if (confidence >= 0.5) return "bg-amber-500/10 text-amber-600"
  return "bg-red-500/10 text-red-600"
}

interface ExpenseForecastCardProps {
  forecast: ExpenseForecast
  currency?: string
}

export async function ExpenseForecastCard({ forecast, currency = "USD" }: ExpenseForecastCardProps) {
  const t = await getTranslations("analytics")
  const { lastMonth, currentMonth, nextMonth, byCategory, alerts } = forecast

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("expenseForecast.title")}</CardTitle>
          <Badge variant="outline" className={getConfidenceColor(nextMonth.confidence)}>
            {t("confidence.label", { level: nextMonth.confidence >= 0.8 ? t("confidence.high") : nextMonth.confidence >= 0.5 ? t("confidence.medium") : t("confidence.low") })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3-stat header */}
        <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground">{t("expenseForecast.lastMonth")}</p>
            <p className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(lastMonth, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("expenseForecast.currentMonth")}</p>
            <p className="text-lg font-semibold text-red-500">
              {formatCurrency(currentMonth, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("expenseForecast.nextMonthProjection")}</p>
            <p className="text-lg font-semibold text-red-500">
              {formatCurrency(nextMonth.projected, currency)}
            </p>
          </div>
        </div>

        {/* Fixed vs Variable */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("expenseForecast.byType")}</p>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded-lg bg-red-500/10">
              <p className="text-xs text-muted-foreground">{t("expenseForecast.fixed")}</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.byType.fixed, currency)}</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-amber-500/10">
              <p className="text-xs text-muted-foreground">{t("expenseForecast.variable")}</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.byType.variable, currency)}</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.slice(0, 2).map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 text-xs"
              >
                <Warning className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Category Breakdown */}
        {byCategory.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("expenseForecast.byCategory")}</p>
            <div className="space-y-2">
              {byCategory.slice(0, 5).map((category) => {
                const maxProjected = Math.max(...byCategory.map((c) => c.projected))
                const width = maxProjected > 0 ? (category.projected / maxProjected) * 100 : 0

                return (
                  <div key={category.categoryId || "uncategorized"} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <span className="truncate max-w-[100px]">{category.categoryName}</span>
                        {category.trend !== 0 && (
                          <span className={`text-xs ${
                            category.trend > 0 ? "text-red-500" : "text-green-600"
                          }`}>
                            {category.trend > 0 ? "+" : ""}{category.trend.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(category.projected, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${width}%`,
                          backgroundColor: category.categoryColor,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
