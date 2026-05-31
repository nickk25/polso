import { tool } from "ai"
import { z } from "zod"
import { getRevenueForecast } from "@/features/analytics/queries/get-forecasts"

export const getRevenueForecastTool = tool({
  description: "Get a revenue/income forecast showing last month, current month, next month projection, quarter, and year estimates with confidence scores.",
  parameters: z.object({}),
  execute: async () => {
    return getRevenueForecast()
  },
})
