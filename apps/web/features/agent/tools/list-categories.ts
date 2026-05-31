import { tool } from "ai"
import { z } from "zod"
import { getAllCategories, getActiveCategories } from "@/features/categories/queries/get-categories"

export const listCategories = tool({
  description: "List transaction categories with their entry counts. Use activeOnly=true to hide empty categories.",
  parameters: z.object({
    activeOnly: z.boolean().default(false).optional().describe("Only return categories that have entries"),
  }),
  execute: async ({ activeOnly }) => {
    const categories = activeOnly ? await getActiveCategories() : await getAllCategories()
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      entryType: c.entryType,
      entryCount: c._count.entries,
    }))
  },
})
