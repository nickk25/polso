import { tool } from "ai"
import { z } from "zod"
import { getTransactions } from "@/features/transactions/queries/get-transactions"
import { truncate } from "../lib/tool-output"

export const listTransactions = tool({
  description: "List transactions filtered by direction, date range, category, counterparty, or search term. Returns up to 50 rows.",
  parameters: z.object({
    direction: z.enum(["expense", "income", "all"]).optional().describe("Filter by expense or income"),
    from: z.string().optional().describe("Start date ISO string e.g. 2026-01-01"),
    to: z.string().optional().describe("End date ISO string e.g. 2026-01-31"),
    categoryId: z.string().optional().describe("Filter by category ID"),
    counterpartyId: z.string().optional().describe("Filter by counterparty ID"),
    search: z.string().optional().describe("Search in description or counterparty name"),
    limit: z.number().min(1).max(50).default(20).optional(),
  }),
  execute: async ({ direction, from, to, categoryId, search, limit }) => {
    const result = await getTransactions(
      {
        direction: direction === "all" ? undefined : direction,
        dateFrom: from ? new Date(from) : undefined,
        dateTo: to ? new Date(to) : undefined,
        categoryId,
        search,
      },
      1,
      limit ?? 20
    )
    return {
      transactions: truncate(
        result.transactions.map((t) => ({
          id: t.id,
          date: t.date,
          direction: t.direction,
          amount: t.amount,
          currency: t.currency,
          description: t.description,
          category: t.category ? { id: t.category.id, name: t.category.name } : null,
          counterparty: t.counterparty ? { id: t.counterparty.id, name: t.counterparty.name } : null,
          status: t.status,
        }))
      ),
      total: result.total,
    }
  },
})
