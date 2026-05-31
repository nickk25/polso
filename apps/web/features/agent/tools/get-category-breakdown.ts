import { tool } from "ai"
import { z } from "zod"
import { getCategoryBreakdown as queryCategoryBreakdown } from "@/features/analytics/queries/get-analytics"

export const getCategoryBreakdownTool = tool({
  description: "Get spending breakdown by category for a given month, showing total amount and percentage per category.",
  parameters: z.object({
    date: z.string().optional().describe("Any date within the desired month, ISO string. Defaults to current month."),
  }),
  execute: async ({ date }) => {
    return queryCategoryBreakdown(date ? new Date(date) : undefined)
  },
})
