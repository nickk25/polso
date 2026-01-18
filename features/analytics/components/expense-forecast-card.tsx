import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendUp, TrendDown, Warning } from "@phosphor-icons/react/dist/ssr"
import type { ExpenseForecast } from "../queries/get-forecasts"

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

interface ExpenseForecastCardProps {
  forecast: ExpenseForecast
  currency?: string
}

export function ExpenseForecastCard({ forecast, currency = "USD" }: ExpenseForecastCardProps) {
  const { nextMonth, byCategory, alerts, monthOverMonthChange } = forecast

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Expense Forecast</CardTitle>
          <Badge variant="outline" className={getConfidenceColor(nextMonth.confidence)}>
            {formatConfidence(nextMonth.confidence)} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Projection */}
        <div className="text-center pb-4 border-b">
          <p className="text-xs text-muted-foreground mb-1">Next Month Projection</p>
          <p className="text-3xl font-bold text-red-500">
            {formatCurrency(nextMonth.projected, currency)}
          </p>
          <div className={`flex items-center justify-center gap-1 text-sm mt-1 ${
            monthOverMonthChange <= 0 ? "text-green-600" : "text-red-500"
          }`}>
            {monthOverMonthChange <= 0 ? (
              <TrendDown className="h-4 w-4" />
            ) : (
              <TrendUp className="h-4 w-4" />
            )}
            {monthOverMonthChange >= 0 ? "+" : ""}{monthOverMonthChange.toFixed(1)}% vs last month
          </div>
        </div>

        {/* Fixed vs Variable */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">By Type</p>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded-lg bg-red-500/10">
              <p className="text-xs text-muted-foreground">Fixed</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.byType.fixed, currency)}</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-amber-500/10">
              <p className="text-xs text-muted-foreground">Variable</p>
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
            <p className="text-xs font-medium text-muted-foreground mb-2">By Category</p>
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
