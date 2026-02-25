"use client"

import { Bar, BarChart, XAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  total: { label: "Income", color: "oklch(0.723 0.219 149.579)" },
} satisfies ChartConfig

interface IncomeTrendChartProps {
  data: Array<{ month: string; total: number }>
  currency?: string
}

export function IncomeTrendChart({ data, currency = "EUR" }: IncomeTrendChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  return (
    <ChartContainer id="income-trend" config={chartConfig} className="h-[200px] w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <div className="flex items-center justify-between gap-8">
                  <span className="text-muted-foreground">Income</span>
                  <span className="font-mono font-medium">{formatCurrency(value as number)}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
