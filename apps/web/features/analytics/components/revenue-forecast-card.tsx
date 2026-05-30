import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import { TrendUp, TrendDown, Minus, Users } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"
import type { RevenueForecast } from "../queries/get-forecasts"

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

function getTrendIcon(trend: "growing" | "stable" | "declining") {
  switch (trend) {
    case "growing":
      return <TrendUp className="h-3.5 w-3.5 text-green-500" />
    case "declining":
      return <TrendDown className="h-3.5 w-3.5 text-red-500" />
    default:
      return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

interface RevenueForecastCardProps {
  forecast: RevenueForecast
  currency?: string
}

export async function RevenueForecastCard({ forecast, currency = "USD" }: RevenueForecastCardProps) {
  const t = await getTranslations("analytics")
  const { lastMonth, currentMonth, nextMonth, quarterProjection, yearProjection, topClients, byCategory } = forecast

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("revenueForecast.title")}</CardTitle>
          <Badge variant="outline" className={getConfidenceColor(nextMonth.confidence)}>
            {t("confidence.label", { level: nextMonth.confidence >= 0.8 ? t("confidence.high") : nextMonth.confidence >= 0.5 ? t("confidence.medium") : t("confidence.low") })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3-stat header */}
        <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground">{t("revenueForecast.lastMonth")}</p>
            <p className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(lastMonth, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("revenueForecast.currentMonth")}</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(currentMonth, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("revenueForecast.nextMonthProjection")}</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(nextMonth.projected, currency)}
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("revenueForecast.breakdown")}</p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{t("revenueForecast.recurring")}</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.breakdown.recurring, currency)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{t("revenueForecast.oneTime")}</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.breakdown.oneTime, currency)}</p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {byCategory.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("revenueForecast.byCategory")}</p>
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

        {/* Projections */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("revenueForecast.projections")}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("revenueForecast.quarter")}</span>
            <span className="font-medium">{formatCurrency(quarterProjection, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("revenueForecast.year")}</span>
            <span className="font-medium">{formatCurrency(yearProjection, currency)}</span>
          </div>
          {nextMonth.projected > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("revenueForecast.recurringShare")}</span>
              <span className="font-medium">
                {Math.round((nextMonth.breakdown.recurring / nextMonth.projected) * 100)}%
              </span>
            </div>
          )}
          {topClients.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("revenueForecast.avgPerClient")}</span>
              <span className="font-medium">
                {formatCurrency(nextMonth.projected / topClients.length, currency)}{t("revenueForecast.perMonth")}
              </span>
            </div>
          )}
        </div>

        {/* Top Clients */}
        {topClients.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">{t("revenueForecast.topClients")}</p>
            </div>
            <div className="space-y-2">
              {topClients.slice(0, 3).map((client) => (
                <div key={client.counterpartyId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(client.trend)}
                    <span className="truncate max-w-[120px]">{client.counterpartyName}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(client.projectedRevenue, currency)}{t("revenueForecast.perMonth")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
