import { tool } from "ai"
import { z } from "zod"
import { getVATSummary } from "@/features/analytics/queries/get-analytics"

export const getVATSummaryTool = tool({
  description:
    "Get quarterly VAT/IVA summary for the org: IVA collected (repercutido, from income) vs IVA paid (soportado, from expenses) and net amount to declare per quarter. Use this to answer questions about VAT obligations, Modelo 303 estimates, or how much VAT the user owes.",
  parameters: z.object({
    year: z.number().int().optional().describe("Fiscal year (defaults to current year)"),
  }),
  execute: async ({ year }) => {
    const summary = await getVATSummary(year)
    return {
      year: summary.year,
      currency: summary.currency,
      currentQuarter: summary.currentQuarter.quarter,
      quarters: summary.quarters.map((q) => ({
        quarter: q.quarter,
        collected: q.collected,
        paid: q.paid,
        net: q.net,
      })),
      ytdCollected: summary.ytdCollected,
      ytdPaid: summary.ytdPaid,
      ytdNet: summary.ytdNet,
    }
  },
})
