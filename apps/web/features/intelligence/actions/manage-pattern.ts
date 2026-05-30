"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

export async function confirmPatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: patternId, organizationId },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: { isConfirmed: true },
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

// Creates a DismissedPattern record so re-detection is skipped for this counterparty/name
export async function dismissPatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: patternId, organizationId, isConfirmed: false },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    await prisma.$transaction([
      prisma.dismissedPattern.create({
        data: {
          organizationId,
          counterpartyId: pattern.counterpartyId,
          patternName: pattern.name,
        },
      }),
      prisma.entry.updateMany({
        where: { recurringPatternId: patternId },
        data: { recurringPatternId: null, entryType: "variable" },
      }),
      prisma.recurringPattern.delete({ where: { id: patternId } }),
    ])

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

export async function pausePatternAction(
  patternId: string,
  reason: "manual" | "missed_payment" = "manual"
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: patternId, organizationId, isConfirmed: true, isActive: true },
    })

    if (!pattern) {
      return errorResponse("Pattern not found or already paused", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: { isActive: false, pauseReason: reason, pausedAt: new Date() },
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

export async function resumePatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: patternId, organizationId, isConfirmed: true, isActive: false },
    })

    if (!pattern) {
      return errorResponse("Pattern not found or already active", "NOT_FOUND")
    }

    await prisma.recurringPattern.update({
      where: { id: patternId },
      data: { isActive: true, pauseReason: null, pausedAt: null },
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

// Does NOT create a DismissedPattern — allows re-detection if the pattern reappears
export async function deletePatternAction(
  patternId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: patternId, organizationId, isConfirmed: true },
    })

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND")
    }

    await prisma.$transaction([
      prisma.entry.updateMany({
        where: { recurringPatternId: patternId },
        data: { recurringPatternId: null, entryType: "variable" },
      }),
      prisma.recurringPattern.delete({ where: { id: patternId } }),
    ])

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
