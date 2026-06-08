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

export type CashFlowResult = z.infer<typeof cashFlowSchema>
export type CategoryBreakdownResult = z.infer<typeof categoryBreakdownSchema>
export type BurnRunwayResult = z.infer<typeof burnRunwaySchema>

export const widgetSchemas = {
  get_cash_flow: cashFlowSchema,
  get_category_breakdown: categoryBreakdownSchema,
  get_burn_and_runway: burnRunwaySchema,
} as const satisfies Record<string, z.ZodTypeAny>
