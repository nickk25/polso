"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@/features/banking/lib/counterparty-normalizer"

interface CreateVendorInput {
  name: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
  defaultExpenseType?: "fixed" | "variable" | null
}

interface UpdateVendorInput {
  name?: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
  defaultExpenseType?: "fixed" | "variable" | null
}

interface MergeVendorsInput {
  sourceVendorIds: string[] // Vendors to merge FROM (will be deleted)
  targetVendorId: string // Vendor to merge INTO (will keep)
}

interface VendorResult {
  id: string
  name: string
  normalizedName: string
}

interface DeleteVendorResult {
  deleted: boolean
  expenseCount?: number
}

interface MergeVendorResult {
  mergedVendorId: string
  expensesReassigned: number
  patternsReassigned: number
  vendorsDeleted: number
}

/**
 * Create a new vendor manually
 */
export async function createVendorAction(
  input: CreateVendorInput
): Promise<ActionResponse<VendorResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      return errorResponse("Vendor name is required", "VALIDATION_ERROR")
    }

    if (input.name.length > 100) {
      return errorResponse("Vendor name must be 100 characters or less", "VALIDATION_ERROR")
    }

    // Generate normalized name
    const normalizedName = normalizeCounterpartyName(input.name.trim())

    // Check for duplicate normalized name
    const existing = await prisma.vendor.findFirst({
      where: {
        organizationId,
        normalizedName,
      },
    })

    if (existing) {
      return errorResponse(
        `A vendor with a similar name already exists: "${existing.name}"`,
        "DUPLICATE_ERROR"
      )
    }

    // Validate category if provided
    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.defaultCategoryId,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        organizationId,
        name: input.name.trim(),
        normalizedName,
        website: input.website || null,
        taxId: input.taxId || null,
        defaultCategoryId: input.defaultCategoryId || null,
        defaultExpenseType: input.defaultExpenseType || null,
        isAutoDetected: false,
        detectionPatterns: [normalizedName],
      },
    })

    revalidatePath("/vendors")
    revalidatePath("/expenses")

    return successResponse({
      id: vendor.id,
      name: vendor.name,
      normalizedName: vendor.normalizedName,
    })
  } catch (error) {
    console.error("Error creating vendor:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create vendor",
      "ERROR"
    )
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendorAction(
  vendorId: string,
  input: UpdateVendorInput
): Promise<ActionResponse<VendorResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        organizationId,
      },
    })

    if (!vendor) {
      return errorResponse("Vendor not found", "NOT_FOUND")
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return errorResponse("Vendor name is required", "VALIDATION_ERROR")
      }

      if (input.name.length > 100) {
        return errorResponse("Vendor name must be 100 characters or less", "VALIDATION_ERROR")
      }
    }

    // Generate new normalized name if name changed
    let newNormalizedName = vendor.normalizedName
    if (input.name && input.name.trim() !== vendor.name) {
      newNormalizedName = normalizeCounterpartyName(input.name.trim())

      // Check for duplicate normalized name
      const existing = await prisma.vendor.findFirst({
        where: {
          organizationId,
          normalizedName: newNormalizedName,
          id: { not: vendorId },
        },
      })

      if (existing) {
        return errorResponse(
          `A vendor with a similar name already exists: "${existing.name}"`,
          "DUPLICATE_ERROR"
        )
      }
    }

    // Validate category if provided
    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.defaultCategoryId,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    // Update vendor
    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: input.name?.trim() ?? vendor.name,
        normalizedName: newNormalizedName,
        website: input.website !== undefined ? input.website : vendor.website,
        taxId: input.taxId !== undefined ? input.taxId : vendor.taxId,
        defaultCategoryId:
          input.defaultCategoryId !== undefined
            ? input.defaultCategoryId
            : vendor.defaultCategoryId,
        defaultExpenseType:
          input.defaultExpenseType !== undefined
            ? input.defaultExpenseType
            : vendor.defaultExpenseType,
      },
    })

    revalidatePath("/vendors")
    revalidatePath("/expenses")

    return successResponse({
      id: updated.id,
      name: updated.name,
      normalizedName: updated.normalizedName,
    })
  } catch (error) {
    console.error("Error updating vendor:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update vendor",
      "ERROR"
    )
  }
}

/**
 * Delete a vendor
 * Cannot delete if there are linked expenses (must reassign first)
 */
export async function deleteVendorAction(
  vendorId: string
): Promise<ActionResponse<DeleteVendorResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the vendor with expense count
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            expenses: true,
            recurringPatterns: true,
          },
        },
      },
    })

    if (!vendor) {
      return errorResponse("Vendor not found", "NOT_FOUND")
    }

    // Check if vendor has linked expenses
    if (vendor._count.expenses > 0) {
      return errorResponse(
        `Cannot delete vendor with ${vendor._count.expenses} linked expense${vendor._count.expenses > 1 ? "s" : ""}. Reassign them first or merge this vendor with another.`,
        "HAS_LINKED_ITEMS"
      )
    }

    // Delete the vendor
    await prisma.vendor.delete({
      where: { id: vendorId },
    })

    revalidatePath("/vendors")
    revalidatePath("/expenses")

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting vendor:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete vendor",
      "ERROR"
    )
  }
}

/**
 * Merge multiple vendors into one
 * Reassigns all expenses and patterns from source vendors to target, then deletes sources
 */
export async function mergeVendorsAction(
  input: MergeVendorsInput
): Promise<ActionResponse<MergeVendorResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Validate input
    if (!input.sourceVendorIds || input.sourceVendorIds.length === 0) {
      return errorResponse("At least one source vendor is required", "VALIDATION_ERROR")
    }

    if (!input.targetVendorId) {
      return errorResponse("Target vendor is required", "VALIDATION_ERROR")
    }

    if (input.sourceVendorIds.includes(input.targetVendorId)) {
      return errorResponse(
        "Target vendor cannot be in the source vendors list",
        "VALIDATION_ERROR"
      )
    }

    // Verify all vendors belong to the organization
    const vendors = await prisma.vendor.findMany({
      where: {
        organizationId,
        id: { in: [...input.sourceVendorIds, input.targetVendorId] },
      },
      select: {
        id: true,
        detectionPatterns: true,
      },
    })

    if (vendors.length !== input.sourceVendorIds.length + 1) {
      return errorResponse("One or more vendors not found", "NOT_FOUND")
    }

    const targetVendor = vendors.find((v) => v.id === input.targetVendorId)
    if (!targetVendor) {
      return errorResponse("Target vendor not found", "NOT_FOUND")
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Reassign all expenses from source vendors to target
      const expensesUpdate = await tx.expense.updateMany({
        where: {
          vendorId: { in: input.sourceVendorIds },
        },
        data: {
          vendorId: input.targetVendorId,
        },
      })

      // 2. Reassign all recurring patterns from source vendors to target
      const patternsUpdate = await tx.recurringPattern.updateMany({
        where: {
          vendorId: { in: input.sourceVendorIds },
        },
        data: {
          vendorId: input.targetVendorId,
        },
      })

      // 3. Merge detection patterns from all source vendors into target
      const sourceVendors = vendors.filter((v) => input.sourceVendorIds.includes(v.id))
      const allPatterns = new Set([
        ...targetVendor.detectionPatterns,
        ...sourceVendors.flatMap((v) => v.detectionPatterns),
      ])

      await tx.vendor.update({
        where: { id: input.targetVendorId },
        data: {
          detectionPatterns: Array.from(allPatterns),
        },
      })

      // 4. Delete source vendors
      await tx.vendor.deleteMany({
        where: {
          id: { in: input.sourceVendorIds },
        },
      })

      return {
        expensesReassigned: expensesUpdate.count,
        patternsReassigned: patternsUpdate.count,
        vendorsDeleted: input.sourceVendorIds.length,
      }
    })

    revalidatePath("/vendors")
    revalidatePath("/expenses")
    revalidatePath("/recurring")

    return successResponse({
      mergedVendorId: input.targetVendorId,
      ...result,
    })
  } catch (error) {
    console.error("Error merging vendors:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to merge vendors",
      "ERROR"
    )
  }
}

/**
 * Get the count of expenses linked to a vendor
 * Useful for showing warning before delete
 */
export async function getVendorUsageAction(
  vendorId: string
): Promise<ActionResponse<{ expenseCount: number; patternCount: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            expenses: true,
            recurringPatterns: true,
          },
        },
      },
    })

    if (!vendor) {
      return errorResponse("Vendor not found", "NOT_FOUND")
    }

    return successResponse({
      expenseCount: vendor._count.expenses,
      patternCount: vendor._count.recurringPatterns,
    })
  } catch (error) {
    console.error("Error getting vendor usage:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get vendor usage",
      "ERROR"
    )
  }
}
