"use client"

import { Hourglass, TrendDown, Wallet } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import type { BurnRunwayResult } from "./registry"

interface BurnRunwayWidgetProps {
  data: BurnRunwayResult
}

function runwayVariant(months: number, burnRate: number): "default" | "secondary" | "destructive" {
  if (burnRate === 0) return "default"
  if (months > 12) return "default"
  if (months >= 6) return "secondary"
  return "destructive"
}

export function BurnRunwayWidget({ data }: BurnRunwayWidgetProps) {
  const { burnRate, runway, totalBalance, currency } = data

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const runwayLabel = burnRate === 0 ? "∞" : `${runway.toFixed(1)} mo`

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Burn &amp; runway
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-start gap-6">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Runway</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{runwayLabel}</span>
              <Badge variant={runwayVariant(runway, burnRate)}>
                {burnRate === 0 ? "no burn" : runway > 12 ? "healthy" : runway >= 6 ? "watch" : "critical"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-l pl-6">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <TrendDown className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Monthly burn</span>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(burnRate)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Balance</span>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(totalBalance)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
