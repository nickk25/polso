"use client"

import { Wallet, ChartBar } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { ForecastChart } from "@/features/analytics/components/forecast-chart"

interface CashFlowForecastMonth {
  month: string
  monthLabel: string
  projectedIncome: number
  projectedExpenses: number
  projectedNet: number
  projectedBalance: number
  confidence: number
  isHistorical: boolean
}

interface CashFlowForecastResult {
  currentBalance: number
  currency: string
  months: CashFlowForecastMonth[]
  assumptions: {
    recurringIncomeCount: number
    recurringExpenseCount: number
    avgMonthlyIncome: number
    avgMonthlyExpenses: number
    trendBasis: string
  }
}

interface CashFlowForecastWidgetProps {
  data: CashFlowForecastResult
}

export function CashFlowForecastWidget({ data }: CashFlowForecastWidgetProps) {
  const { currentBalance, currency, months } = data

  const forecastMonths = months.filter((m) => !m.isHistorical).length

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Cash flow forecast · Next {forecastMonths} month{forecastMonths !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="mb-3 flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Current balance</span>
          <span className="ml-1 text-sm font-semibold tabular-nums">
            {formatCurrency(currentBalance)}
          </span>
        </div>
        <ForecastChart months={months} currency={currency} />
        <div className="mt-2 flex items-center gap-1.5">
          <ChartBar className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Solid bars = historical · Dashed = projected
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
