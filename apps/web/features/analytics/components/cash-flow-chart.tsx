"use client"

import { Bar, BarChart, XAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CashFlowData } from "../queries/get-analytics"

const chartConfig = {
  inflow: { label: "Income", color: "oklch(0.723 0.219 149.579)" },
  outflow: { label: "Expenses", color: "oklch(0.704 0.191 22.216)" },
} satisfies ChartConfig

interface CashFlowChartProps {
  data: CashFlowData[]
  currency?: string
  height?: string
}

export function CashFlowChart({ data, currency = "EUR", height = "200px" }: CashFlowChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  return (
    <ChartContainer id="cash-flow" config={chartConfig} className="w-full" style={{ height }}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
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
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
