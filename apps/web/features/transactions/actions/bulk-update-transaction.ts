"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

export async function bulkUpdateEntryCategoryAction(
  entryIds: string[],
  categoryId: string | null
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, OR: [{ isSystem: true }, { organizationId }] },
      })
      if (!category) return errorResponse("Category not found", "NOT_FOUND")
    }

    const result = await prisma.entry.updateMany({
      where: { id: { in: entryIds }, organizationId },
      data: { categoryId, categorySource: "manual", categoryConfidence: 1 },
    })

    // Propagate manual category to each distinct counterparty
    if (categoryId) {
      const affected = await prisma.entry.findMany({
        where: { id: { in: entryIds }, organizationId, counterpartyId: { not: null } },
        select: { counterpartyId: true },
        distinct: ["counterpartyId"],
      })
      if (affected.length > 0) {
        await prisma.counterparty.updateMany({
          where: { id: { in: affected.map((e) => e.counterpartyId!) }, organizationId },
          data: { defaultCategoryId: categoryId },
        })
      }
    }

    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating entry category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entries",
      "ERROR"
    )
  }
}

export async function bulkUpdateEntryTypeAction(
  entryIds: string[],
  entryType: "fixed" | "variable"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.entry.updateMany({
      where: { id: { in: entryIds }, organizationId },
      data: { entryType },
    })

    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating entry type:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entries",
      "ERROR"
    )
  }
}

export async function bulkUpdateEntryStatusAction(
  entryIds: string[],
  status: "pending" | "verified" | "excluded"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.entry.updateMany({
      where: { id: { in: entryIds }, organizationId },
      data: { status },
    })

    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating entry status:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update entries",
      "ERROR"
    )
  }
}
