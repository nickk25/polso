import { tool } from "ai"
import { z } from "zod"
import { getCashFlowForecast } from "@/features/analytics/queries/get-forecasts"

export const getCashFlowForecastTool = tool({
  description: "Get a cash flow forecast projecting income, expenses, and balance for the next N months based on historical patterns.",
  parameters: z.object({
    forecastMonths: z.number().min(1).max(12).default(3).optional().describe("Number of months to forecast (default 3)"),
  }),
  execute: async ({ forecastMonths }) => {
    return getCashFlowForecast(forecastMonths ?? 3)
  },
})
