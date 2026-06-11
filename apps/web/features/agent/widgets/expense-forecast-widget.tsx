"use client"

import { ArrowsClockwise, Minus, TrendDown, TrendUp, Warning } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"

interface CategoryExpenseForecast {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  projected: number
  lastMonth: number
  trend: number // % change
  confidence: number
}

interface ExpenseForecastAlert {
  type: "spike" | "new_recurring" | "unusual"
  message: string
  categoryId?: string
}

interface ExpenseForecastResult {
  lastMonth: number
  currentMonth: number
  nextMonth: {
    projected: number
    byType: {
      fixed: number
      variable: number
    }
    confidence: number
  }
  byCategory: CategoryExpenseForecast[]
  alerts: ExpenseForecastAlert[]
  monthOverMonthChange: number
}

interface ExpenseForecastWidgetProps {
  data: ExpenseForecastResult
}

const TOP_N = 5

export function ExpenseForecastWidget({ data }: ExpenseForecastWidgetProps) {
  const { nextMonth, byCategory, alerts, monthOverMonthChange } = data

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  const trendColor =
    monthOverMonthChange > 0
      ? "text-red-500"
      : monthOverMonthChange < 0
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-muted-foreground"

  const TrendIcon =
    monthOverMonthChange > 0 ? TrendUp : monthOverMonthChange < 0 ? TrendDown : Minus

  const trendIconColor =
    monthOverMonthChange > 0
      ? "text-red-500"
      : monthOverMonthChange < 0
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-muted-foreground"

  const confidenceVariant: "default" | "secondary" =
    nextMonth.confidence >= 0.7 ? "default" : "secondary"

  const topCategories = [...byCategory]
    .sort((a, b) => b.projected - a.projected)
    .slice(0, TOP_N)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Previsión de gastos
          </p>
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className={`h-3 w-3 ${trendIconColor}`} />
            <span>{formatPercent(monthOverMonthChange)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex flex-col gap-4">
        {/* KPI row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatCurrency(nextMonth.projected)}
            </span>
            <Badge variant={confidenceVariant}>
              {Math.round(nextMonth.confidence * 100)}% confianza
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Fijo:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrency(nextMonth.byType.fixed)}
              </span>
            </span>
            <span>
              Variable:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrency(nextMonth.byType.variable)}
              </span>
            </span>
          </div>
        </div>

        {/* Category list */}
        {topCategories.length > 0 && (
          <ol className="flex flex-col gap-1.5 text-xs">
            {topCategories.map((cat) => (
              <li
                key={cat.categoryId ?? cat.categoryName}
                className="flex items-center gap-2 min-w-0"
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: cat.categoryColor }}
                />
                <span className="flex-1 truncate text-foreground/80">{cat.categoryName}</span>
                <span className="shrink-0 tabular-nums font-medium">
                  {formatCurrency(cat.projected)}
                </span>
                <span
                  className={`shrink-0 tabular-nums text-muted-foreground w-12 text-right ${
                    cat.trend > 0
                      ? "text-red-500"
                      : cat.trend < 0
                      ? "text-emerald-500 dark:text-emerald-400"
                      : ""
                  }`}
                >
                  {formatPercent(cat.trend)}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-3">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {alert.type === "spike" ? (
                  <TrendUp className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                ) : alert.type === "unusual" ? (
                  <Warning className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                ) : (
                  <ArrowsClockwise className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                )}
                <span className="text-muted-foreground">{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
