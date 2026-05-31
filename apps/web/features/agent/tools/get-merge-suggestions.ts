import { tool } from "ai"
import { z } from "zod"
import { getCounterparties } from "@/features/counterparties/queries/get-counterparties"
import { computeMergeSuggestions } from "@/features/counterparties/lib/merge-suggestions"

export const getMergeSuggestions = tool({
  description: "Find counterparties (vendors/clients) that are likely duplicates and should be merged, based on name similarity.",
  parameters: z.object({}),
  execute: async () => {
    const counterparties = await getCounterparties()
    const groups = computeMergeSuggestions(counterparties)
    return groups.slice(0, 10).map((g) => ({
      suggestedPrimaryName: g.key,
      counterparties: g.counterparties.map((c) => ({ id: c.id, name: c.name, entryCount: c._count.entries })),
      totalEntries: g.totalEntries,
    }))
  },
})
