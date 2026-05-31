import { tool } from "ai"
import { z } from "zod"
import { getExpenseForecast } from "@/features/analytics/queries/get-forecasts"

export const getExpenseForecastTool = tool({
  description: "Get an expense forecast with next month's projected spending breakdown by fixed/variable, category-level projections, and any spend alerts.",
  parameters: z.object({}),
  execute: async () => {
    return getExpenseForecast()
  },
})
