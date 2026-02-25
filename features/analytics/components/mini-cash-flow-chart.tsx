"use client"

import { Bar, BarChart, XAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CashFlowData } from "../queries/get-analytics"

const chartConfig = {
  inflow: { label: "Income", color: "oklch(0.723 0.219 149.579)" },
  outflow: { label: "Expenses", color: "oklch(0.704 0.191 22.216)" },
} satisfies ChartConfig

interface MiniCashFlowChartProps {
  data: CashFlowData[]
  currency?: string
}

export function MiniCashFlowChart({ data, currency = "EUR" }: MiniCashFlowChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  return (
    <ChartContainer id="mini-cash-flow" config={chartConfig} className="h-[80px] w-full aspect-auto">
      <BarChart data={data} accessibilityLayer margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={4} className="text-[10px]" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-8">
                  <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                  <span className="font-mono font-medium">{formatCurrency(value as number)}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
