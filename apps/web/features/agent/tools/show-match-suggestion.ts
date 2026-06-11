import { tool } from "ai"
import { z } from "zod"

export const showMatchSuggestion = tool({
  description:
    "Display a match suggestion card so the user can confirm or decline the receipt-to-transaction match. Call this when a receipt upload results in a high-confidence or suggested match.",
  parameters: z.object({
    suggestionId: z.string().describe("The MatchSuggestion ID"),
    transactionId: z.string().describe("The matched Transaction ID"),
    confidence: z.number().min(0).max(1).describe("Match confidence score (0–1)"),
    transactionName: z.string().describe("Name or merchant of the matched transaction"),
    amount: z.number().describe("Transaction amount"),
    currency: z.string().describe("Transaction currency code"),
    date: z.string().describe("Transaction date as ISO string"),
  }),
  execute: async (params) => {
    // Return params as-is — the MatchSuggestionWidget handles rendering
    return params
  },
})
