"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { canonicalize } from "@polso/banking"
import {
  mergeCounterpartiesCore,
  type MergeCounterpartiesCoreResult,
} from "../lib/merge-counterparties-core"

/** Brand tokens to seed detectionPatterns with (empty for government keys). */
function seedPatterns(matchKey: string): string[] {
  return matchKey.startsWith("gov:") ? [] : matchKey.split(" ").filter(Boolean)
}

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

type MergeCounterpartiesResult = MergeCounterpartiesCoreResult

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

    const { matchKey, seenLocations } = canonicalize(input.name.trim())
    if (!matchKey) {
      return errorResponse("Please enter a more specific vendor name", "VALIDATION_ERROR")
    }
    const normalizedName = matchKey

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
        seenLocations,
        detectionPatterns: seedPatterns(normalizedName),
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
      const recomputed = canonicalize(input.name.trim()).matchKey
      if (!recomputed) {
        return errorResponse("Please enter a more specific vendor name", "VALIDATION_ERROR")
      }
      newNormalizedName = recomputed
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

    const result = await prisma.$transaction((tx) =>
      mergeCounterpartiesCore(tx, {
        organizationId,
        sourceIds: input.sourceIds,
        targetId: input.targetId,
      })
    )

    revalidatePath("/counterparties")
    revalidatePath("/transactions")
    revalidatePath("/recurring")

    return successResponse(result)
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
