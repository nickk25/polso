"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface UpdateExpenseInput {
  categoryId?: string | null
  expenseType?: "fixed" | "variable"
  status?: "pending" | "documented" | "excluded"
  description?: string | null
}

/**
 * Update an expense's details
 */
export async function updateExpenseAction(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify expense belongs to organization
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        organizationId,
      },
    })

    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND")
    }

    // If categoryId is provided and not null, verify it's valid
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

    // Update the expense
    // If category is being changed, mark as manually set
    const categoryChanged = input.categoryId !== undefined && input.categoryId !== expense.categoryId

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
        expenseType: input.expenseType,
        status: input.status,
        description: input.description !== undefined ? input.description : undefined,
        // Mark as manually categorized if category changed
        ...(categoryChanged && {
          categorySource: "manual",
          categoryConfidence: 1,
        }),
      },
    })

    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse({ id: updated.id })
  } catch (error) {
    console.error("Error updating expense:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update expense",
      "ERROR"
    )
  }
}

/**
 * Bulk update category for multiple expenses
 */
export async function bulkUpdateExpenseCategoryAction(
  expenseIds: string[],
  categoryId: string | null
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    // If categoryId is provided, verify it's valid
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

    // Bulk update - mark as manually categorized
    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
      data: {
        categoryId,
        categorySource: "manual",
        categoryConfidence: 1,
      },
    })

    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating expenses:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update expenses",
      "ERROR"
    )
  }
}

/**
 * Bulk update expense type for multiple expenses
 */
export async function bulkUpdateExpenseTypeAction(
  expenseIds: string[],
  expenseType: "fixed" | "variable"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
      data: {
        expenseType,
      },
    })

    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating expense type:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update expenses",
      "ERROR"
    )
  }
}

/**
 * Bulk update status for multiple expenses
 */
export async function bulkUpdateExpenseStatusAction(
  expenseIds: string[],
  status: "pending" | "documented" | "excluded"
): Promise<ActionResponse<{ count: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
      data: {
        status,
      },
    })

    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse({ count: result.count })
  } catch (error) {
    console.error("Error bulk updating expense status:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update expenses",
      "ERROR"
    )
  }
}
