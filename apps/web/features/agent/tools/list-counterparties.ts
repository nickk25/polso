import { tool } from "ai"
import { z } from "zod"
import { getCounterparties } from "@/features/counterparties/queries/get-counterparties"
import { truncate } from "../lib/tool-output"

export const listCounterparties = tool({
  description: "List counterparties (vendors, suppliers, clients) with total spend and entry count.",
  parameters: z.object({
    search: z.string().optional().describe("Filter by name"),
    limit: z.number().min(1).max(50).default(20).optional(),
  }),
  execute: async ({ search, limit }) => {
    const all = await getCounterparties()
    const filtered = search
      ? all.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      : all
    return truncate(
      filtered.map((c) => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent,
        entryCount: c._count.entries,
        lastEntryDate: c.lastEntryDate,
        defaultCategory: c.defaultCategory ? { name: c.defaultCategory.name } : null,
      })),
      limit ?? 20
    )
  },
})
