"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@polso/banking"

interface CreateCounterpartyInput {
  name: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
  defaultEntryType?: "fixed" | "variable" | null
}

interface UpdateCounterpartyInput {
  name?: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
  defaultEntryType?: "fixed" | "variable" | null
}

interface MergeCounterpartiesInput {
  sourceIds: string[]
  targetId: string
}

interface CounterpartyResult {
  id: string
  name: string
  normalizedName: string
}

interface DeleteCounterpartyResult {
  deleted: boolean
  entryCount?: number
}

interface MergeCounterpartiesResult {
  mergedId: string
  entriesReassigned: number
  patternsReassigned: number
  deletedCount: number
}

export async function createCounterpartyAction(
  input: CreateCounterpartyInput
): Promise<ActionResponse<CounterpartyResult>> {
  try {
    const { organizationId } = await getAuthContext()

    if (!input.name || input.name.trim().length === 0) {
      return errorResponse("Name is required", "VALIDATION_ERROR")
    }
    if (input.name.length > 100) {
      return errorResponse("Name must be 100 characters or less", "VALIDATION_ERROR")
    }

    const normalizedName = normalizeCounterpartyName(input.name.trim())

    const existing = await prisma.counterparty.findFirst({
      where: { organizationId, normalizedName },
    })
    if (existing) {
      return errorResponse(
        `A counterparty with a similar name already exists: "${existing.name}"`,
        "DUPLICATE_ERROR"
      )
    }

    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.defaultCategoryId, OR: [{ isSystem: true }, { organizationId }] },
      })
      if (!category) return errorResponse("Category not found", "NOT_FOUND")
    }

    const cp = await prisma.counterparty.create({
      data: {
        organizationId,
        name: input.name.trim(),
        normalizedName,
        type: "vendor",
        website: input.website || null,
        taxId: input.taxId || null,
        defaultCategoryId: input.defaultCategoryId || null,
        defaultEntryType: input.defaultEntryType || null,
        isAutoDetected: false,
        detectionPatterns: [normalizedName],
      },
    })

    revalidatePath("/counterparties")
    revalidatePath("/transactions")

    return successResponse({ id: cp.id, name: cp.name, normalizedName: cp.normalizedName })
  } catch (error) {
    console.error("Error creating counterparty:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create counterparty",
      "ERROR"
    )
  }
}

export async function updateCounterpartyAction(
  counterpartyId: string,
  input: UpdateCounterpartyInput
): Promise<ActionResponse<CounterpartyResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const cp = await prisma.counterparty.findFirst({
      where: { id: counterpartyId, organizationId },
    })
    if (!cp) return errorResponse("Counterparty not found", "NOT_FOUND")

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return errorResponse("Name is required", "VALIDATION_ERROR")
      }
      if (input.name.length > 100) {
        return errorResponse("Name must be 100 characters or less", "VALIDATION_ERROR")
      }
    }

    let newNormalizedName = cp.normalizedName
    if (input.name && input.name.trim() !== cp.name) {
      newNormalizedName = normalizeCounterpartyName(input.name.trim())
      const duplicate = await prisma.counterparty.findFirst({
        where: { organizationId, normalizedName: newNormalizedName, id: { not: counterpartyId } },
      })
      if (duplicate) {
        return errorResponse(
          `A counterparty with a similar name already exists: "${duplicate.name}"`,
          "DUPLICATE_ERROR"
        )
      }
    }

    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.defaultCategoryId, OR: [{ isSystem: true }, { organizationId }] },
      })
      if (!category) return errorResponse("Category not found", "NOT_FOUND")
    }

    const updated = await prisma.counterparty.update({
      where: { id: counterpartyId },
      data: {
        name: input.name?.trim() ?? cp.name,
        normalizedName: newNormalizedName,
        website: input.website !== undefined ? input.website : cp.website,
        taxId: input.taxId !== undefined ? input.taxId : cp.taxId,
        defaultCategoryId:
          input.defaultCategoryId !== undefined ? input.defaultCategoryId : cp.defaultCategoryId,
        defaultEntryType:
          input.defaultEntryType !== undefined ? input.defaultEntryType : cp.defaultEntryType,
      },
    })

    revalidatePath("/counterparties")
    revalidatePath("/transactions")

    return successResponse({ id: updated.id, name: updated.name, normalizedName: updated.normalizedName })
  } catch (error) {
    console.error("Error updating counterparty:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update counterparty",
      "ERROR"
    )
  }
}

export async function deleteCounterpartyAction(
  counterpartyId: string
): Promise<ActionResponse<DeleteCounterpartyResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const cp = await prisma.counterparty.findFirst({
      where: { id: counterpartyId, organizationId },
      include: {
        _count: { select: { entries: true, recurringPatterns: true } },
      },
    })
    if (!cp) return errorResponse("Counterparty not found", "NOT_FOUND")

    if (cp._count.entries > 0) {
      return errorResponse(
        `Cannot delete counterparty with ${cp._count.entries} linked transaction${cp._count.entries > 1 ? "s" : ""}. Reassign them first or merge with another.`,
        "HAS_LINKED_ITEMS"
      )
    }

    await prisma.counterparty.delete({ where: { id: counterpartyId } })

    revalidatePath("/counterparties")
    revalidatePath("/transactions")

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting counterparty:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete counterparty",
      "ERROR"
    )
  }
}

export async function mergeCounterpartiesAction(
  input: MergeCounterpartiesInput
): Promise<ActionResponse<MergeCounterpartiesResult>> {
  try {
    const { organizationId } = await getAuthContext()

    if (!input.sourceIds || input.sourceIds.length === 0) {
      return errorResponse("At least one source counterparty is required", "VALIDATION_ERROR")
    }
    if (!input.targetId) {
      return errorResponse("Target counterparty is required", "VALIDATION_ERROR")
    }
    if (input.sourceIds.includes(input.targetId)) {
      return errorResponse("Target cannot be in the source list", "VALIDATION_ERROR")
    }

    const counterparties = await prisma.counterparty.findMany({
      where: {
        organizationId,
        id: { in: [...input.sourceIds, input.targetId] },
      },
      select: { id: true, detectionPatterns: true },
    })

    if (counterparties.length !== input.sourceIds.length + 1) {
      return errorResponse("One or more counterparties not found", "NOT_FOUND")
    }

    const targetCp = counterparties.find((c) => c.id === input.targetId)
    if (!targetCp) return errorResponse("Target counterparty not found", "NOT_FOUND")

    const result = await prisma.$transaction(async (tx) => {
      const entriesUpdate = await tx.entry.updateMany({
        where: { counterpartyId: { in: input.sourceIds } },
        data: { counterpartyId: input.targetId },
      })

      const patternsUpdate = await tx.recurringPattern.updateMany({
        where: { counterpartyId: { in: input.sourceIds } },
        data: { counterpartyId: input.targetId },
      })

      const sourceCps = counterparties.filter((c) => input.sourceIds.includes(c.id))
      const allPatterns = new Set([
        ...targetCp.detectionPatterns,
        ...sourceCps.flatMap((c) => c.detectionPatterns),
      ])

      await tx.counterparty.update({
        where: { id: input.targetId },
        data: { detectionPatterns: Array.from(allPatterns) },
      })

      await tx.counterparty.deleteMany({
        where: { id: { in: input.sourceIds } },
      })

      return {
        entriesReassigned: entriesUpdate.count,
        patternsReassigned: patternsUpdate.count,
        deletedCount: input.sourceIds.length,
      }
    })

    revalidatePath("/counterparties")
    revalidatePath("/transactions")
    revalidatePath("/recurring")

    return successResponse({ mergedId: input.targetId, ...result })
  } catch (error) {
    console.error("Error merging counterparties:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to merge counterparties",
      "ERROR"
    )
  }
}

export async function getCounterpartyUsageAction(
  counterpartyId: string
): Promise<ActionResponse<{ entryCount: number; patternCount: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const cp = await prisma.counterparty.findFirst({
      where: { id: counterpartyId, organizationId },
      include: {
        _count: { select: { entries: true, recurringPatterns: true } },
      },
    })
    if (!cp) return errorResponse("Counterparty not found", "NOT_FOUND")

    return successResponse({
      entryCount: cp._count.entries,
      patternCount: cp._count.recurringPatterns,
    })
  } catch (error) {
    console.error("Error getting counterparty usage:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get counterparty usage",
      "ERROR"
    )
  }
}
