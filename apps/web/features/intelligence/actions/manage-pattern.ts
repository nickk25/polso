"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

/**
 * Confirm a detected recurring pattern
 */
export async function confirmPatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: {
        isConfirmed: true,
      },
    })

    revalidatePath("/recurring")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error confirming pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to confirm pattern",
      "ERROR"
    )
  }
}

/**
 * Dismiss a suggested (unconfirmed) pattern
 * This creates a DismissedPattern record to prevent re-detection
 */
export async function dismissPatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
        isConfirmed: false, // Only for suggestions
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    // Create dismissed pattern record to prevent re-detection
    await prisma.dismissedPattern.create({
      data: {
        organizationId,
        counterpartyId: pattern.counterpartyId,
        patternName: pattern.name,
      },
    })

    // Unlink entries from this pattern
    await prisma.entry.updateMany({
      where: { recurringPatternId: patternId },
      data: { recurringPatternId: null, entryType: "variable" },
    })

    // Delete the pattern
    await prisma.recurringPattern.delete({
      where: { id: patternId },
    })

    revalidatePath("/recurring")
    revalidatePath("/transactions")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error dismissing pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to dismiss pattern",
      "ERROR"
    )
  }
}

/**
 * Pause an active recurring pattern
 * Keeps historical data but stops tracking
 */
export async function pausePatternAction(
  patternId: string,
  reason: "manual" | "missed_payment" = "manual"
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
        isConfirmed: true,
        isActive: true,
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found or already paused", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: {
        isActive: false,
        pauseReason: reason,
        pausedAt: new Date(),
      },
    })

    revalidatePath("/recurring")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error pausing pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to pause pattern",
      "ERROR"
    )
  }
}

/**
 * Resume a paused recurring pattern
 */
export async function resumePatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
        isConfirmed: true,
        isActive: false,
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found or already active", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: {
        isActive: true,
        pauseReason: null,
        pausedAt: null,
      },
    })

    revalidatePath("/recurring")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error resuming pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to resume pattern",
      "ERROR"
    )
  }
}

/**
 * Delete a confirmed pattern (active or paused)
 * Unlinks expenses but does NOT create a DismissedPattern record
 * (allows re-detection if the pattern appears again)
 */
export async function deletePatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
        isConfirmed: true,
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    // Unlink entries from this pattern
    await prisma.entry.updateMany({
      where: { recurringPatternId: patternId },
      data: { recurringPatternId: null, entryType: "variable" },
    })

    // Delete the pattern
    await prisma.recurringPattern.delete({
      where: { id: patternId },
    })

    revalidatePath("/recurring")
    revalidatePath("/transactions")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error deleting pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete pattern",
      "ERROR"
    )
  }
}

/**
 * Update a recurring pattern
 */
export async function updatePatternAction(
  patternId: string,
  data: {
    name?: string
    frequency?: string
    expectedAmount?: number
    expectedDayOfMonth?: number | null
    categoryId?: string | null
    isActive?: boolean
  }
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: {
        id: patternId,
        organizationId,
      },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: {
        name: data.name,
        frequency: data.frequency,
        expectedAmount: data.expectedAmount,
        expectedDayOfMonth: data.expectedDayOfMonth,
        categoryId: data.categoryId,
        isActive: data.isActive,
      },
    })

    revalidatePath("/recurring")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error updating pattern:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update pattern",
      "ERROR"
    )
  }
}

