import { tool } from "ai"
import { z } from "zod"
import { getTopCounterparties as queryTopCounterparties } from "@/features/analytics/queries/get-analytics"

export const getTopCounterpartiesTool = tool({
  description: "Get the top counterparties (vendors/clients) by spend for a given month.",
  parameters: z.object({
    limit: z.number().min(1).max(20).default(10).optional(),
    date: z.string().optional().describe("Any date within the desired month, ISO string. Defaults to current month."),
  }),
  execute: async ({ limit, date }) => {
    return queryTopCounterparties(limit ?? 10, date ? new Date(date) : undefined)
  },
})
