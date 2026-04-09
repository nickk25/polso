"use server"

import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { revalidatePath } from "next/cache"
import { type ActionResponse, successResponse, errorResponse } from "@/lib/types"

interface UpdateIncomeInput {
  categoryId?: string | null
  source?: string
  status?: "pending" | "confirmed" | "excluded"
}

/**
 * Update a single income's details
 */
export async function updateIncomeAction(
  incomeId: string,
  input: UpdateIncomeInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    const income = await prisma.income.findFirst({
      where: {
        id: incomeId,
        organizationId,
      },
    })

    if (!income) {
      return errorResponse("Income not found", "NOT_FOUND")
    }

    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [
            { isSystem: true },
            { organizationId },
          ],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    const updated = await prisma.income.update({
      where: { id: incomeId },
      data: {
        categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
        source: input.source,
        status: input.status,
      },
    })

    revalidatePath("/incomes")
    revalidatePath("/dashboard")

    return successResponse({ id: updated.id })
  } catch (error) {
    console.error("Error updating income:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update income",
      "ERROR"
    )
  }
}

/**
 * Bulk update source for multiple incomes
 */
export async function bulkUpdateIncomeSourceAction(
  incomeIds: string[],
  source: string
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.income.updateMany({
      where: {
        id: { in: incomeIds },
        organizationId,
      },
      data: {
        source,
      },
    })

    revalidatePath("/incomes")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating income source:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update income",
      "ERROR"
    )
  }
}

/**
 * Bulk update category for multiple incomes
 */
export async function bulkUpdateIncomeCategoryAction(
  incomeIds: string[],
  categoryId: string | null
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          OR: [
            { isSystem: true },
            { organizationId },
          ],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    const result = await prisma.income.updateMany({
      where: {
        id: { in: incomeIds },
        organizationId,
      },
      data: {
        categoryId,
      },
    })

    revalidatePath("/incomes")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating income category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update income",
      "ERROR"
    )
  }
}

/**
 * Bulk update status for multiple incomes
 */
export async function bulkUpdateIncomeStatusAction(
  incomeIds: string[],
  status: "pending" | "confirmed" | "excluded"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.income.updateMany({
      where: {
        id: { in: incomeIds },
        organizationId,
      },
      data: {
        status,
      },
    })

    revalidatePath("/incomes")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating income status:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update income",
      "ERROR"
    )
  }
}
