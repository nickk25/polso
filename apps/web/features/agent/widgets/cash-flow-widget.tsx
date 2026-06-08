"use client"

import { TrendUp, TrendDown } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { MiniCashFlowChart } from "@/features/analytics/components/mini-cash-flow-chart"
import type { CashFlowResult } from "./registry"

interface CashFlowWidgetProps {
  data: CashFlowResult
}

export function CashFlowWidget({ data }: CashFlowWidgetProps) {
  if (data.length === 0) return null

  const totalNet = data.reduce((sum, d) => sum + d.net, 0)
  const isPositive = totalNet >= 0
  const TrendIcon = isPositive ? TrendUp : TrendDown

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value))

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Cash flow · Last {data.length} months
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <MiniCashFlowChart data={data} />
        <div className="mt-2 flex items-center gap-1.5">
          <TrendIcon
            className={`h-3.5 w-3.5 ${isPositive ? "text-emerald-500" : "text-red-500"}`}
          />
          <span className={`text-sm font-semibold tabular-nums ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
            {isPositive ? "+" : "−"}{formatCurrency(totalNet)}
          </span>
          <span className="text-xs text-muted-foreground">net over period</span>
        </div>
      </CardContent>
    </Card>
  )
}
