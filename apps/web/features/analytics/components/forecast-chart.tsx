"use client"

import { Bar, BarChart, XAxis, CartesianGrid, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@polso/ui/chart"

interface ForecastMonth {
  month: string
  monthLabel: string
  projectedIncome: number
  projectedExpenses: number
  projectedNet: number
  projectedBalance: number
  confidence: number
  isHistorical: boolean
}

const chartConfig = {
  income: { label: "Income", color: "oklch(0.723 0.219 149.579)" },
  expenses: { label: "Expenses", color: "oklch(0.704 0.191 22.216)" },
} satisfies ChartConfig

interface ForecastChartProps {
  months: ForecastMonth[]
  currency?: string
}

export function ForecastChart({ months, currency = "USD" }: ForecastChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  // Transform data for grouped bar chart
  const chartData = months.map((m) => ({
    monthLabel: m.monthLabel,
    income: m.projectedIncome,
    expenses: m.projectedExpenses,
    isHistorical: m.isHistorical,
  }))

  return (
    <ChartContainer id="forecast" config={chartConfig} className="h-[160px] w-full aspect-auto">
      <BarChart data={chartData} accessibilityLayer margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          className="text-[10px]"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-8">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="font-mono font-medium">
                    {formatCurrency(value as number)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="income" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`income-${index}`}
              fill={entry.isHistorical ? "var(--color-income)" : "var(--color-income)"}
              fillOpacity={entry.isHistorical ? 1 : 0.4}
              stroke={entry.isHistorical ? "none" : "var(--color-income)"}
              strokeWidth={entry.isHistorical ? 0 : 1}
              strokeDasharray={entry.isHistorical ? "none" : "4 2"}
            />
          ))}
        </Bar>
        <Bar dataKey="expenses" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`expenses-${index}`}
              fill={entry.isHistorical ? "var(--color-expenses)" : "var(--color-expenses)"}
              fillOpacity={entry.isHistorical ? 1 : 0.4}
              stroke={entry.isHistorical ? "none" : "var(--color-expenses)"}
              strokeWidth={entry.isHistorical ? 0 : 1}
              strokeDasharray={entry.isHistorical ? "none" : "4 2"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
