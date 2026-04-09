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
import type { MonthlySpend } from "../queries/get-analytics"

const chartConfig = {
  fixed: { label: "Fixed", color: "oklch(0.637 0.237 25.331)" },
  variable: { label: "Variable", color: "oklch(0.769 0.188 70.08)" },
} satisfies ChartConfig

interface MonthlySpendChartProps {
  data: MonthlySpend[]
  currency?: string
}

export function MonthlySpendChart({ data, currency = "EUR" }: MonthlySpendChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  return (
    <ChartContainer id="monthly-spend" config={chartConfig} className="h-[200px] w-full">
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
        <Bar dataKey="fixed" stackId="a" fill="var(--color-fixed)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="variable" stackId="a" fill="var(--color-variable)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
