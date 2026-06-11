import { z } from "zod"

export const cashFlowSchema = z.array(
  z.object({
    month: z.string(),
    inflow: z.number(),
    outflow: z.number(),
    net: z.number(),
  })
)

export const categoryBreakdownSchema = z.array(
  z.object({
    categoryId: z.string().nullable(),
    categoryName: z.string(),
    categoryColor: z.string(),
    total: z.number(),
    percentage: z.number(),
    count: z.number(),
  })
)

export const burnRunwaySchema = z.object({
  burnRate: z.number(),
  runway: z.number(),
  totalBalance: z.number(),
  currency: z.string(),
})

export const vatSummarySchema = z.object({
  year: z.number(),
  currency: z.string(),
  currentQuarter: z.number(),
  quarters: z.array(
    z.object({
      quarter: z.number(),
      collected: z.number(),
      paid: z.number(),
      net: z.number(),
    })
  ),
  ytdCollected: z.number(),
  ytdPaid: z.number(),
  ytdNet: z.number(),
})

export const matchSuggestionSchema = z.object({
  suggestionId: z.string(),
  transactionId: z.string(),
  confidence: z.number().min(0).max(1),
  transactionName: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
})

export const cashFlowForecastSchema = z.object({
  currentBalance: z.number(),
  currency: z.string(),
  months: z.array(
    z.object({
      month: z.string(),
      monthLabel: z.string(),
      projectedIncome: z.number(),
      projectedExpenses: z.number(),
      projectedNet: z.number(),
      projectedBalance: z.number(),
      confidence: z.number(),
      isHistorical: z.boolean(),
    })
  ),
  assumptions: z.object({
    recurringIncomeCount: z.number(),
    recurringExpenseCount: z.number(),
    avgMonthlyIncome: z.number(),
    avgMonthlyExpenses: z.number(),
    trendBasis: z.string(),
  }),
})

export const topCounterpartiesSchema = z.array(
  z.object({
    counterpartyId: z.string().nullable(),
    counterpartyName: z.string(),
    total: z.number(),
    count: z.number(),
    percentage: z.number(),
  })
)

export const expenseForecastSchema = z.object({
  lastMonth: z.number(),
  currentMonth: z.number(),
  nextMonth: z.object({
    projected: z.number(),
    byType: z.object({
      fixed: z.number(),
      variable: z.number(),
    }),
    confidence: z.number(),
  }),
  byCategory: z.array(
    z.object({
      categoryId: z.string().nullable(),
      categoryName: z.string(),
      categoryColor: z.string(),
      projected: z.number(),
      lastMonth: z.number(),
      trend: z.number(),
      confidence: z.number(),
    })
  ),
  alerts: z.array(
    z.object({
      type: z.enum(["spike", "new_recurring", "unusual"]),
      message: z.string(),
      categoryId: z.string().optional(),
    })
  ),
  monthOverMonthChange: z.number(),
})

export const revenueForecastSchema = z.object({
  lastMonth: z.number(),
  currentMonth: z.number(),
  nextMonth: z.object({
    projected: z.number(),
    breakdown: z.object({
      recurring: z.number(),
      oneTime: z.number(),
    }),
    confidence: z.number(),
  }),
  quarterProjection: z.number(),
  yearProjection: z.number(),
  monthOverMonthChange: z.number(),
  topClients: z.array(
    z.object({
      counterpartyId: z.string(),
      counterpartyName: z.string(),
      projectedRevenue: z.number(),
      lastMonthRevenue: z.number(),
      trend: z.enum(["growing", "stable", "declining"]),
      confidence: z.number(),
    })
  ),
  byCategory: z.array(
    z.object({
      categoryId: z.string().nullable(),
      categoryName: z.string(),
      categoryColor: z.string(),
      projected: z.number(),
    })
  ),
})

export type CashFlowResult = z.infer<typeof cashFlowSchema>
export type CategoryBreakdownResult = z.infer<typeof categoryBreakdownSchema>
export type BurnRunwayResult = z.infer<typeof burnRunwaySchema>
export type VatSummaryResult = z.infer<typeof vatSummarySchema>
export type MatchSuggestionResult = z.infer<typeof matchSuggestionSchema>
export type CashFlowForecastResult = z.infer<typeof cashFlowForecastSchema>
export type TopCounterpartiesResult = z.infer<typeof topCounterpartiesSchema>
export type ExpenseForecastResult = z.infer<typeof expenseForecastSchema>
export type RevenueForecastResult = z.infer<typeof revenueForecastSchema>

export const widgetSchemas = {
  get_cash_flow: cashFlowSchema,
  get_category_breakdown: categoryBreakdownSchema,
  get_burn_and_runway: burnRunwaySchema,
  get_vat_summary: vatSummarySchema,
  show_match_suggestion: matchSuggestionSchema,
  get_cash_flow_forecast: cashFlowForecastSchema,
  get_top_counterparties: topCounterpartiesSchema,
  get_expense_forecast: expenseForecastSchema,
  get_revenue_forecast: revenueForecastSchema,
} as const satisfies Record<string, z.ZodTypeAny>
