"use client"

import { Minus, TrendDown, TrendUp } from "@phosphor-icons/react"
import { Badge } from "@polso/ui/badge"
import { Card, CardContent, CardHeader } from "@polso/ui/card"

interface CategoryRevenueForecast {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  projected: number
}

interface CounterpartyRevenueForecast {
  counterpartyId: string
  counterpartyName: string
  projectedRevenue: number
  lastMonthRevenue: number
  trend: "growing" | "stable" | "declining"
  confidence: number
}

export interface RevenueForecastResult {
  lastMonth: number
  currentMonth: number
  nextMonth: {
    projected: number
    breakdown: {
      recurring: number
      oneTime: number
    }
    confidence: number
  }
  quarterProjection: number
  yearProjection: number
  monthOverMonthChange: number
  topClients: CounterpartyRevenueForecast[]
  byCategory: CategoryRevenueForecast[]
}

interface RevenueForecastWidgetProps {
  data: RevenueForecastResult
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "alta"
  if (confidence >= 0.5) return "media"
  return "baja"
}

function trendBadgeVariant(
  trend: "growing" | "stable" | "declining"
): "default" | "secondary" | "destructive" {
  if (trend === "growing") return "default"
  if (trend === "stable") return "secondary"
  return "destructive"
}

function TrendIcon({ change }: { change: number }) {
  if (change > 0) return <TrendUp className="h-3.5 w-3.5" />
  if (change < 0) return <TrendDown className="h-3.5 w-3.5" />
  return <Minus className="h-3.5 w-3.5" />
}

function momVariant(change: number): "default" | "secondary" | "destructive" {
  if (change > 0) return "default"
  if (change < 0) return "destructive"
  return "secondary"
}

export function RevenueForecastWidget({ data }: RevenueForecastWidgetProps) {
  const { lastMonth, currentMonth, nextMonth, quarterProjection, yearProjection, monthOverMonthChange, topClients } = data
  const top3 = topClients.slice(0, 3)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Previsión de ingresos
          </p>
          <Badge variant={momVariant(monthOverMonthChange)}>
            <TrendIcon change={monthOverMonthChange} />
            <span className="ml-1">{formatPercent(monthOverMonthChange)} vs mes ant.</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex flex-col gap-4">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Mes pasado</span>
            <span className="text-xl font-semibold tabular-nums">{formatCurrency(lastMonth)}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l pl-4">
            <span className="text-xs text-muted-foreground">Mes actual</span>
            <span className="text-xl font-semibold tabular-nums">{formatCurrency(currentMonth)}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l pl-4">
            <span className="text-xs text-muted-foreground">Próximo mes (proyectado)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums">{formatCurrency(nextMonth.projected)}</span>
              <Badge variant="outline">{confidenceLabel(nextMonth.confidence)}</Badge>
            </div>
          </div>
        </div>

        {/* Breakdown row */}
        <div className="flex gap-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Recurrente</span>
            <span className="font-medium tabular-nums">{formatCurrency(nextMonth.breakdown.recurring)}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l pl-4">
            <span className="text-xs text-muted-foreground">Puntual</span>
            <span className="font-medium tabular-nums">{formatCurrency(nextMonth.breakdown.oneTime)}</span>
          </div>
        </div>

        {/* Top clients */}
        {top3.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Principales clientes</p>
            <div className="flex flex-col gap-1.5">
              {top3.map((client) => (
                <div key={client.counterpartyId} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[180px]">{client.counterpartyName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(client.projectedRevenue)}</span>
                    <Badge variant={trendBadgeVariant(client.trend)}>
                      {client.trend === "growing" ? "creciendo" : client.trend === "stable" ? "estable" : "bajando"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer projections */}
        <div className="flex gap-4 border-t pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Proyección trimestral</span>
            <span className="text-sm font-medium tabular-nums">{formatCurrency(quarterProjection)}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l pl-4">
            <span className="text-xs text-muted-foreground">Proyección anual</span>
            <span className="text-sm font-medium tabular-nums">{formatCurrency(yearProjection)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
