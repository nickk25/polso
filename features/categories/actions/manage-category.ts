"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface CreateCategoryInput {
  name: string
  color: string
  icon?: string | null
  parentId?: string | null
  expenseType?: string | null
}

interface UpdateCategoryInput {
  name?: string
  color?: string
  icon?: string | null
  expenseType?: string | null
}

interface CategoryResult {
  id: string
  name: string
  slug: string
  color: string
}

interface DeleteCategoryResult {
  deleted: boolean
  expenseCount?: number
}

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Ensure slug is unique within the organization
 */
async function ensureUniqueSlug(
  organizationId: string,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        organizationId,
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

/**
 * Create a new custom category
 */
export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<ActionResponse<CategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      return errorResponse("Category name is required", "VALIDATION_ERROR")
    }

    if (input.name.length > 50) {
      return errorResponse("Category name must be 50 characters or less", "VALIDATION_ERROR")
    }

    // Validate color (hex format)
    if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
      return errorResponse("Invalid color format. Use hex format (e.g., #6366f1)", "VALIDATION_ERROR")
    }

    // Generate unique slug
    const baseSlug = generateSlug(input.name.trim())
    const slug = await ensureUniqueSlug(organizationId, baseSlug)

    // Validate parent category if provided
    if (input.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: input.parentId,
          OR: [
            { isSystem: true },
            { organizationId },
          ],
        },
      })

      if (!parentCategory) {
        return errorResponse("Parent category not found", "NOT_FOUND")
      }
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        organizationId,
        name: input.name.trim(),
        slug,
        color: input.color,
        icon: input.icon || null,
        parentId: input.parentId || null,
        expenseType: input.expenseType || null,
        isSystem: false,
      },
    })

    revalidatePath("/categories")
    revalidatePath("/expenses")

    return successResponse({
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color,
    })
  } catch (error) {
    console.error("Error creating category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create category",
      "ERROR"
    )
  }
}

/**
 * Update an existing custom category
 */
export async function updateCategoryAction(
  categoryId: string,
  input: UpdateCategoryInput
): Promise<ActionResponse<CategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the category
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId,
        isSystem: false, // Cannot edit system categories
      },
    })

    if (!category) {
      return errorResponse("Category not found or cannot be edited", "NOT_FOUND")
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return errorResponse("Category name is required", "VALIDATION_ERROR")
      }

      if (input.name.length > 50) {
        return errorResponse("Category name must be 50 characters or less", "VALIDATION_ERROR")
      }
    }

    // Validate color if provided
    if (input.color !== undefined) {
      if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
        return errorResponse("Invalid color format. Use hex format (e.g., #6366f1)", "VALIDATION_ERROR")
      }
    }

    // Generate new slug if name changed
    let newSlug = category.slug
    if (input.name && input.name.trim() !== category.name) {
      const baseSlug = generateSlug(input.name.trim())
      newSlug = await ensureUniqueSlug(organizationId, baseSlug, categoryId)
    }

    // Update category
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: input.name?.trim() ?? category.name,
        slug: newSlug,
        color: input.color ?? category.color,
        icon: input.icon !== undefined ? input.icon : category.icon,
        expenseType: input.expenseType !== undefined ? input.expenseType : category.expenseType,
      },
    })

    revalidatePath("/categories")
    revalidatePath("/expenses")

    return successResponse({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      color: updated.color,
    })
  } catch (error) {
    console.error("Error updating category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update category",
      "ERROR"
    )
  }
}

/**
 * Delete a custom category
 * Cannot delete if there are linked expenses (must reassign first)
 */
export async function deleteCategoryAction(
  categoryId: string
): Promise<ActionResponse<DeleteCategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the category
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId,
        isSystem: false, // Cannot delete system categories
      },
      include: {
        _count: {
          select: {
            expenses: true,
            incomes: true,
          },
        },
      },
    })

    if (!category) {
      return errorResponse("Category not found or cannot be deleted", "NOT_FOUND")
    }

    // Check if category has linked expenses or incomes
    const totalLinked = category._count.expenses + category._count.incomes
    if (totalLinked > 0) {
      return errorResponse(
        `Cannot delete category with ${totalLinked} linked transaction${totalLinked > 1 ? "s" : ""}. Reassign them first.`,
        "HAS_LINKED_ITEMS"
      )
    }

    // Delete the category
    await prisma.category.delete({
      where: { id: categoryId },
    })

    revalidatePath("/categories")
    revalidatePath("/expenses")

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete category",
      "ERROR"
    )
  }
}

/**
 * Get the count of expenses/incomes linked to a category
 * Useful for showing warning before delete
 */
export async function getCategoryUsageAction(
  categoryId: string
): Promise<ActionResponse<{ expenseCount: number; incomeCount: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [
          { isSystem: true },
          { organizationId },
        ],
      },
      include: {
        _count: {
          select: {
            expenses: true,
            incomes: true,
          },
        },
      },
    })

    if (!category) {
      return errorResponse("Category not found", "NOT_FOUND")
    }

    return successResponse({
      expenseCount: category._count.expenses,
      incomeCount: category._count.incomes,
    })
  } catch (error) {
    console.error("Error getting category usage:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get category usage",
      "ERROR"
    )
  }
}

/**
 * Toggle the hidden state of a category for the current organization
 */
export async function toggleCategoryVisibilityAction(
  categoryId: string,
  isHidden: boolean
): Promise<ActionResponse<{ isHidden: boolean }>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify the category exists and is accessible
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ isSystem: true }, { organizationId }],
      },
    })

    if (!category) {
      return errorResponse("Category not found", "NOT_FOUND")
    }

    await prisma.categoryPreference.upsert({
      where: { organizationId_categoryId: { organizationId, categoryId } },
      update: { isHidden },
      create: { organizationId, categoryId, isHidden },
    })

    revalidatePath("/categories")
    revalidatePath("/expenses")
    revalidatePath("/incomes")

    return successResponse({ isHidden })
  } catch (error) {
    console.error("Error toggling category visibility:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update category visibility",
      "ERROR"
    )
  }
}
