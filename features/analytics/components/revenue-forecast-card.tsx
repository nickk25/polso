import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendUp, TrendDown, Minus, Users } from "@phosphor-icons/react/dist/ssr"
import type { RevenueForecast } from "../queries/get-forecasts"

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

export function RevenueForecastCard({ forecast, currency = "USD" }: RevenueForecastCardProps) {
  const { nextMonth, quarterProjection, yearProjection, monthOverMonthChange, topClients } = forecast

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Revenue Forecast</CardTitle>
          <Badge variant="outline" className={getConfidenceColor(nextMonth.confidence)}>
            {formatConfidence(nextMonth.confidence)} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Projection */}
        <div className="text-center pb-4 border-b">
          <p className="text-xs text-muted-foreground mb-1">Next Month Projection</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(nextMonth.projected, currency)}
          </p>
          <div className={`flex items-center justify-center gap-1 text-sm mt-1 ${
            monthOverMonthChange >= 0 ? "text-green-600" : "text-red-500"
          }`}>
            {monthOverMonthChange >= 0 ? (
              <TrendUp className="h-4 w-4" />
            ) : (
              <TrendDown className="h-4 w-4" />
            )}
            {monthOverMonthChange >= 0 ? "+" : ""}{monthOverMonthChange.toFixed(1)}% vs last month
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Breakdown</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Recurring</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.breakdown.recurring, currency)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Trending</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.breakdown.trending, currency)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">One-time</p>
              <p className="text-sm font-medium">{formatCurrency(nextMonth.breakdown.oneTime, currency)}</p>
            </div>
          </div>
        </div>

        {/* Long-term Projections */}
        <div className="flex justify-between text-sm pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Quarter</p>
            <p className="font-medium">{formatCurrency(quarterProjection, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Year</p>
            <p className="font-medium">{formatCurrency(yearProjection, currency)}</p>
          </div>
        </div>

        {/* Top Clients */}
        {topClients.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Top Clients</p>
            </div>
            <div className="space-y-2">
              {topClients.slice(0, 3).map((client) => (
                <div key={client.clientId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(client.trend)}
                    <span className="truncate max-w-[120px]">{client.clientName}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(client.projectedRevenue, currency)}/mo
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
