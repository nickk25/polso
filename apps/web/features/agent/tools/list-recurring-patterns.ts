import { tool } from "ai"
import { z } from "zod"
import { getAllPatternsGrouped } from "@/features/intelligence/queries/get-recurring-patterns"

export const listRecurringPatterns = tool({
  description: "List detected recurring payment patterns (subscriptions, payroll, rent, etc.) with their status and expected amounts.",
  parameters: z.object({
    status: z.enum(["active", "paused", "all"]).default("all").optional().describe("Filter by pattern status"),
  }),
  execute: async ({ status }) => {
    const { confirmed, suggested, paused, currency } = await getAllPatternsGrouped()

    const formatPattern = (p: { id: string; name: string; frequency: string; expectedAmount: number | null; confidenceScore: number | null; lastOccurrence: Date | null; counterparty: { name: string } | null; category: { name: string } | null }) => ({
      id: p.id,
      name: p.name,
      frequency: p.frequency,
      expectedAmount: p.expectedAmount,
      confidenceScore: p.confidenceScore,
      lastOccurrence: p.lastOccurrence,
      counterparty: p.counterparty?.name ?? null,
      category: p.category?.name ?? null,
    })

    if (status === "active") return { patterns: confirmed.map(formatPattern), currency }
    if (status === "paused") return { patterns: paused.map(formatPattern), currency }
    return {
      confirmed: confirmed.map(formatPattern),
      suggested: suggested.map(formatPattern),
      paused: paused.map(formatPattern),
      currency,
    }
  },
})
