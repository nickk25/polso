import { tool } from "ai"
import { z } from "zod"
import { getCashFlow } from "@/features/analytics/queries/get-analytics"

export const getCashFlowTool = tool({
  description: "Get historical monthly cash flow (income vs expenses) for the last N months.",
  parameters: z.object({
    months: z.number().min(1).max(24).default(6).optional().describe("Number of months to include (default 6)"),
    endMonth: z.string().optional().describe("End month ISO date string, defaults to now"),
  }),
  execute: async ({ months, endMonth }) => {
    const data = await getCashFlow(months ?? 6, endMonth ? new Date(endMonth) : undefined)
    return data
  },
})
