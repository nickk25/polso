"use client"

import { ReceiptX } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import { Separator } from "@polso/ui/separator"
import type { VatSummaryResult } from "./registry"

interface VatWidgetProps {
  data: VatSummaryResult
}

function vatBadgeVariant(net: number): "default" | "secondary" | "destructive" {
  if (net === 0) return "secondary"
  if (net > 0) return "secondary"  // owed — styled amber via className
  return "default"                  // refund — styled green via className
}

export function VatWidget({ data }: VatWidgetProps) {
  const { year, currency, currentQuarter, quarters, ytdCollected, ytdPaid, ytdNet } = data

  const current = quarters.find((q) => q.quarter === currentQuarter) ?? quarters[quarters.length - 1]
  const net = current?.net ?? 0

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value))

  const badgeLabel = net === 0 ? "no movement" : net > 0 ? "owed" : "refund"
  const netColor = net === 0
    ? "text-muted-foreground"
    : net > 0
    ? "text-amber-500"
    : "text-emerald-500 dark:text-emerald-400"

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          VAT · Q{currentQuarter} {year}
        </p>
      </CardHeader>
      <CardContent className="pb-3 flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className={`text-2xl font-semibold tabular-nums ${netColor}`}>
            {net === 0 ? "—" : (net > 0 ? "" : "−") + formatCurrency(net)}
          </span>
          <Badge
            variant={vatBadgeVariant(net)}
            className={net > 0 ? "text-amber-500 border-amber-500/30" : ""}
          >
            {badgeLabel}
          </Badge>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA repercutido</span>
            <span className="tabular-nums font-medium">{formatCurrency(current?.collected ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA soportado</span>
            <span className="tabular-nums font-medium">{formatCurrency(current?.paid ?? 0)}</span>
          </div>
          <Separator className="my-0.5" />
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <ReceiptX className="h-3 w-3" />
              YTD net
            </span>
            <span className={`tabular-nums font-medium ${ytdNet > 0 ? "text-amber-500" : ytdNet < 0 ? "text-emerald-500 dark:text-emerald-400" : ""}`}>
              {ytdNet === 0 ? "—" : (ytdNet > 0 ? "" : "−") + formatCurrency(ytdNet)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
