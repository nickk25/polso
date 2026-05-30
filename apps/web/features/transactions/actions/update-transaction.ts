"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface UpdateEntryInput {
  categoryId?: string | null
  entryType?: "fixed" | "variable"
  status?: "pending" | "verified" | "excluded"
  description?: string | null
}

export async function updateEntryAction(
  entryId: string,
  input: UpdateEntryInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    const entry = await prisma.entry.findFirst({
      where: { id: entryId, organizationId },
      select: { id: true, categoryId: true, counterpartyId: true },
    })

    if (!entry) {
      return errorResponse("Entry not found", "NOT_FOUND")
    }

    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, OR: [{ isSystem: true }, { organizationId }] },
      })
      if (!category) return errorResponse("Category not found", "NOT_FOUND")
    }

    const categoryChanged = input.categoryId !== undefined && input.categoryId !== entry.categoryId

    const updated = await prisma.entry.update({
      where: { id: entryId },
      data: {
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.entryType !== undefined && { entryType: input.entryType }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.description !== undefined && { description: input.description }),
        ...(categoryChanged && { categorySource: "manual", categoryConfidence: 1 }),
      },
    })

    // Propagate manual category back to counterparty for future auto-categorization
    if (categoryChanged && input.categoryId && entry.counterpartyId) {
      await prisma.counterparty.update({
        where: { id: entry.counterpartyId },
        data: { defaultCategoryId: input.categoryId },
      })
    }

    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return successResponse({ id: updated.id })
  } catch (error) {
    console.error("Error updating entry:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entry",
      "ERROR"
    )
  }
}
