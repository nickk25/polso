import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export const getTransaction = tool({
  description: "Get full details of a single transaction by its ID, including any attached documents.",
  parameters: z.object({
    id: z.string().describe("The transaction entry ID"),
  }),
  execute: async ({ id }) => {
    const { organizationId } = await getAuthContext()
    const entry = await prisma.entry.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        date: true,
        direction: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        entryType: true,
        notes: true,
        category: { select: { id: true, name: true, color: true } },
        counterparty: { select: { id: true, name: true, website: true } },
      },
    })
    if (!entry) return { error: "Transaction not found" }
    return entry
  },
})
