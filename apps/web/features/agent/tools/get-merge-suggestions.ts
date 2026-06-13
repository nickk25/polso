import { tool } from "ai"
import { z } from "zod"
import { getCounterparties } from "@/features/counterparties/queries/get-counterparties"
import { computeMergeSuggestions } from "@/features/counterparties/lib/merge-suggestions"

export const getMergeSuggestions = tool({
  description:
    "Find counterparties (vendors/clients) that are likely duplicates and could be merged, based on name similarity. These are suggestions for review, not automatic merges — confidence is 0–1; when requiresConfirmation is true the user must approve before merging.",
  parameters: z.object({}),
  execute: async () => {
    const counterparties = await getCounterparties()
    const groups = computeMergeSuggestions(counterparties)
    return groups.slice(0, 10).map((g) => ({
      suggestedPrimaryName: g.counterparties[0]?.name ?? g.key,
      confidence: Number(g.confidence.toFixed(2)),
      requiresConfirmation: g.confidence < 0.5,
      sharedTokens: g.sharedTokens,
      counterparties: g.counterparties.map((c) => ({ id: c.id, name: c.name, entryCount: c._count.entries })),
      totalEntries: g.totalEntries,
    }))
  },
})
