"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import type { CategoryBreakdownResult } from "./registry"

interface CategoryBreakdownWidgetProps {
  data: CategoryBreakdownResult
}

const TOP_N = 5

export function CategoryBreakdownWidget({ data }: CategoryBreakdownWidgetProps) {
  if (data.length === 0) return null

  const sorted = [...data].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, TOP_N)
  const others = sorted.slice(TOP_N)

  const othersTotal = others.reduce((sum, d) => sum + d.total, 0)
  const grandTotal = data.reduce((sum, d) => sum + d.total, 0)
  const othersPercentage = grandTotal > 0 ? (othersTotal / grandTotal) * 100 : 0

  const chartData = [
    ...top,
    ...(others.length > 0
      ? [{ categoryId: "__other__", categoryName: "Others", categoryColor: "#94a3b8", total: othersTotal, percentage: othersPercentage, count: others.length }]
      : []),
  ]

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Spending by category
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-4">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  dataKey="total"
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.categoryId ?? "__uncategorized__"} fill={entry.categoryColor} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload as (typeof chartData)[number]
                    return (
                      <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                        <p className="font-medium">{d.categoryName}</p>
                        <p className="text-muted-foreground">{formatCurrency(d.total)} · {d.percentage.toFixed(1)}%</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <ol className="flex flex-1 flex-col gap-1.5 text-xs min-w-0">
            {chartData.map((entry) => (
              <li key={entry.categoryId ?? "__uncategorized__"} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.categoryColor }}
                />
                <span className="flex-1 truncate text-foreground/80">{entry.categoryName}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{entry.percentage.toFixed(0)}%</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
