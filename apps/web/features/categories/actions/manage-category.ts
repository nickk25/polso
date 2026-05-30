"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface CreateCategoryInput {
  name: string
  color: string
  entryType?: string | null
}

interface UpdateCategoryInput {
  name?: string
  color?: string
  entryType?: string | null
}

interface CategoryResult {
  id: string
  name: string
  color: string
}

interface DeleteCategoryResult {
  deleted: boolean
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

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

    if (!existing) return slug

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<ActionResponse<CategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    if (!input.name || input.name.trim().length === 0) {
      return errorResponse("Category name is required", "VALIDATION_ERROR")
    }
    if (input.name.length > 50) {
      return errorResponse("Category name must be 50 characters or less", "VALIDATION_ERROR")
    }
    if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
      return errorResponse("Invalid color format. Use hex format (e.g., #6366f1)", "VALIDATION_ERROR")
    }

    const slug = await ensureUniqueSlug(organizationId, generateSlug(input.name.trim()))

    const category = await prisma.category.create({
      data: {
        organizationId,
        name: input.name.trim(),
        slug,
        color: input.color,
        entryType: input.entryType || null,
        isSystem: false,
      },
    })

    revalidatePath("/categories")
    revalidatePath("/transactions")

    return successResponse({ id: category.id, name: category.name, color: category.color })
  } catch (error) {
    console.error("Error creating category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create category",
      "ERROR"
    )
  }
}

export async function updateCategoryAction(
  categoryId: string,
  input: UpdateCategoryInput
): Promise<ActionResponse<CategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId, isSystem: false },
    })

    if (!category) {
      return errorResponse("Category not found or cannot be edited", "NOT_FOUND")
    }

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return errorResponse("Category name is required", "VALIDATION_ERROR")
      }
      if (input.name.length > 50) {
        return errorResponse("Category name must be 50 characters or less", "VALIDATION_ERROR")
      }
    }

    if (input.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
      return errorResponse("Invalid color format. Use hex format (e.g., #6366f1)", "VALIDATION_ERROR")
    }

    let newSlug = category.slug
    if (input.name && input.name.trim() !== category.name) {
      newSlug = await ensureUniqueSlug(organizationId, generateSlug(input.name.trim()), categoryId)
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: input.name?.trim() ?? category.name,
        slug: newSlug,
        color: input.color ?? category.color,
        entryType: input.entryType !== undefined ? input.entryType : category.entryType,
      },
    })

    revalidatePath("/categories")
    revalidatePath("/transactions")

    return successResponse({ id: updated.id, name: updated.name, color: updated.color })
  } catch (error) {
    console.error("Error updating category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update category",
      "ERROR"
    )
  }
}

export async function deleteCategoryAction(
  categoryId: string
): Promise<ActionResponse<DeleteCategoryResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId, isSystem: false },
      include: { _count: { select: { entries: true } } },
    })

    if (!category) {
      return errorResponse("Category not found or cannot be deleted", "NOT_FOUND")
    }

    if (category._count.entries > 0) {
      return errorResponse(
        `Cannot delete category with ${category._count.entries} linked transaction${category._count.entries > 1 ? "s" : ""}. Reassign them first.`,
        "HAS_LINKED_ITEMS"
      )
    }

    await prisma.category.delete({ where: { id: categoryId } })

    revalidatePath("/categories")
    revalidatePath("/transactions")

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete category",
      "ERROR"
    )
  }
}

export async function toggleCategoryVisibilityAction(
  categoryId: string,
  isHidden: boolean
): Promise<ActionResponse<{ isHidden: boolean }>> {
  try {
    const { organizationId } = await getAuthContext()

    const category = await prisma.category.findFirst({
      where: { id: categoryId, OR: [{ isSystem: true }, { organizationId }] },
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
    revalidatePath("/transactions")

    return successResponse({ isHidden })
  } catch (error) {
    console.error("Error toggling category visibility:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update category visibility",
      "ERROR"
    )
  }
}
