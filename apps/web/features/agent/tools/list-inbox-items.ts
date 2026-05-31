import { tool } from "ai"
import { z } from "zod"
import { getVaultItems } from "@/features/inbox/queries/get-vault"
import { truncate } from "../lib/tool-output"

export const listInboxItems = tool({
  description: "List inbox/vault items (uploaded receipts and documents) and their transaction match status.",
  parameters: z.object({
    matchStatus: z.enum(["matched", "unmatched", "pending", "all"]).default("all").optional(),
    limit: z.number().min(1).max(50).default(20).optional(),
  }),
  execute: async ({ matchStatus, limit }) => {
    const statusFilter = matchStatus === "all" ? undefined : matchStatus
    const result = await getVaultItems(statusFilter, 1, limit ?? 20)
    return {
      items: truncate(
        result.items.map((item) => ({
          id: item.id,
          fileName: item.displayName ?? item.fileName,
          amount: item.amount,
          currency: item.currency,
          date: item.date,
          status: item.status,
          matchedTransaction: item.transaction
            ? { id: item.transaction.id, description: item.transaction.description }
            : null,
        }))
      ),
      total: result.total,
    }
  },
})
