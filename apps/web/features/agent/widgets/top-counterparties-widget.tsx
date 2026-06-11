"use client"

import { Card, CardContent, CardHeader } from "@polso/ui/card"

export type TopCounterpartiesResult = Array<{
  counterpartyId: string | null
  counterpartyName: string
  total: number
  count: number
  percentage: number
}>

interface TopCounterpartiesWidgetProps {
  data: TopCounterpartiesResult
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function TopCounterpartiesWidget({ data }: TopCounterpartiesWidgetProps) {
  if (data.length === 0) return null

  const rows = data.slice(0, 10)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Top proveedores
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <ol className="flex flex-col gap-3">
          {rows.map((item, index) => (
            <li key={item.counterpartyId ?? `unknown-${index}`} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground text-right">
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {item.counterpartyName}
                </span>
                <span className="shrink-0 tabular-nums text-sm font-medium">
                  {formatCurrency(item.total)}
                </span>
                <span className="w-9 shrink-0 tabular-nums text-xs text-muted-foreground text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="ml-6 flex flex-col gap-0.5">
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-0.5 rounded-full bg-muted-foreground/30"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.count} {item.count === 1 ? "transacción" : "transacciones"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
