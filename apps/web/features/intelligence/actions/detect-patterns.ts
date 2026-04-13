"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { detectRecurringPatterns } from "@polso/intelligence"

interface DetectionResult {
  patternsDetected: number
  patternsCreated: number
  patternsUpdated: number
  patternsPaused: number
}

/**
 * Calculate the next expected date for a pattern based on frequency
 */
function getNextExpectedDate(lastOccurrence: Date, frequency: string, expectedDayOfMonth: number | null): Date {
  const next = new Date(lastOccurrence)

  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7)
      break
    case "biweekly":
      next.setDate(next.getDate() + 14)
      break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      if (expectedDayOfMonth) {
        next.setDate(expectedDayOfMonth)
      }
      break
    case "quarterly":
      next.setMonth(next.getMonth() + 3)
      break
    case "yearly":
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }

  return next
}

/**
 * Check and auto-pause patterns that have missed their expected payment date
 */
async function checkMissedPayments(organizationId: string): Promise<number> {
  const gracePeriodDays = 7
  const today = new Date()

  // Get all active confirmed patterns
  const activePatterns = await prisma.recurringPattern.findMany({
    where: {
      organizationId,
      isActive: true,
      isConfirmed: true,
      lastOccurrence: { not: null },
    },
  })

  let pausedCount = 0

  for (const pattern of activePatterns) {
    if (!pattern.lastOccurrence) continue

    const nextExpected = getNextExpectedDate(
      pattern.lastOccurrence,
      pattern.frequency,
      pattern.expectedDayOfMonth
    )

    // Add grace period
    nextExpected.setDate(nextExpected.getDate() + gracePeriodDays)

    // If we're past the grace period and no new expense has been linked
    if (today > nextExpected) {
      await prisma.recurringPattern.update({
        where: { id: pattern.id },
        data: {
          isActive: false,
          pauseReason: "missed_payment",
          pausedAt: new Date(),
        },
      })
      pausedCount++
    }
  }

  return pausedCount
}

/**
 * Run recurring pattern detection on all expenses
 */
export async function detectPatternsAction(): Promise<ActionResponse<DetectionResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Get dismissed patterns to avoid re-detecting
    const dismissedPatterns = await prisma.dismissedPattern.findMany({
      where: { organizationId },
      select: { vendorId: true, patternName: true },
    })

    const dismissedVendorIds = new Set(
      dismissedPatterns.filter(d => d.vendorId).map(d => d.vendorId)
    )
    const dismissedNames = new Set(
      dismissedPatterns.map(d => d.patternName.toLowerCase())
    )

    // Get all expenses with vendor info for the past year
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId,
        date: { gte: oneYearAgo },
        status: { not: "excluded" },
      },
      include: {
        vendor: true,
      },
      orderBy: { date: "asc" },
    })

    // Detect patterns
    const detectedPatterns = detectRecurringPatterns(expenses)

    let patternsCreated = 0
    let patternsUpdated = 0

    for (const pattern of detectedPatterns) {
      // Skip if this vendor/name was previously dismissed
      if (pattern.vendorId && dismissedVendorIds.has(pattern.vendorId)) {
        continue
      }
      if (dismissedNames.has(pattern.name.toLowerCase())) {
        continue
      }

      // Check if pattern already exists (by vendor or name)
      const existing = await prisma.recurringPattern.findFirst({
        where: {
          organizationId,
          OR: [
            pattern.vendorId ? { vendorId: pattern.vendorId } : {},
            { name: pattern.name },
          ].filter((o) => Object.keys(o).length > 0),
        },
      })

      if (existing) {
        // Check if this is a paused pattern
        if (!existing.isActive && existing.isConfirmed) {
          // If manually paused, respect user's decision - don't reactivate
          if (existing.pauseReason === "manual") {
            continue
          }

          // If auto-paused (missed_payment) and we have new expenses, reactivate it
          if (existing.pauseReason === "missed_payment") {
            // Check if there's a new expense after the lastOccurrence
            const hasNewExpense = pattern.lastOccurrence && existing.lastOccurrence &&
              pattern.lastOccurrence > existing.lastOccurrence

            if (hasNewExpense) {
              // Reactivate the pattern
              await prisma.recurringPattern.update({
                where: { id: existing.id },
                data: {
                  isActive: true,
                  pauseReason: null,
                  pausedAt: null,
                  expectedAmount: pattern.expectedAmount,
                  amountVariancePct: pattern.amountVariancePct,
                  expectedDayOfMonth: pattern.expectedDayOfMonth,
                  confidenceScore: pattern.confidenceScore,
                  lastOccurrence: pattern.lastOccurrence,
                  occurrenceCount: pattern.occurrenceCount,
                },
              })

              // Link expenses to this pattern
              await prisma.expense.updateMany({
                where: {
                  id: { in: pattern.expenseIds },
                },
                data: {
                  recurringPatternId: existing.id,
                  expenseType: "fixed",
                },
              })

              patternsUpdated++
              continue
            }
          }

          // Otherwise skip paused patterns
          continue
        }

        // Update existing active pattern
        await prisma.recurringPattern.update({
          where: { id: existing.id },
          data: {
            expectedAmount: pattern.expectedAmount,
            amountVariancePct: pattern.amountVariancePct,
            expectedDayOfMonth: pattern.expectedDayOfMonth,
            confidenceScore: pattern.confidenceScore,
            lastOccurrence: pattern.lastOccurrence,
            occurrenceCount: pattern.occurrenceCount,
            // Don't change frequency or isConfirmed if already set
            frequency: existing.isConfirmed ? existing.frequency : pattern.frequency,
          },
        })

        // Link expenses to this pattern
        await prisma.expense.updateMany({
          where: {
            id: { in: pattern.expenseIds },
          },
          data: {
            recurringPatternId: existing.id,
            expenseType: "fixed",
          },
        })

        patternsUpdated++
      } else {
        // Create new pattern
        const newPattern = await prisma.recurringPattern.create({
          data: {
            organizationId,
            name: pattern.name,
            vendorId: pattern.vendorId,
            frequency: pattern.frequency,
            expectedAmount: pattern.expectedAmount,
            amountVariancePct: pattern.amountVariancePct,
            expectedDayOfMonth: pattern.expectedDayOfMonth,
            categoryId: pattern.categoryId,
            expenseType: "fixed",
            isActive: true,
            isConfirmed: false, // Needs user confirmation
            confidenceScore: pattern.confidenceScore,
            firstOccurrence: pattern.firstOccurrence,
            lastOccurrence: pattern.lastOccurrence,
            occurrenceCount: pattern.occurrenceCount,
          },
        })

        // Link expenses to this pattern
        await prisma.expense.updateMany({
          where: {
            id: { in: pattern.expenseIds },
          },
          data: {
            recurringPatternId: newPattern.id,
            expenseType: "fixed",
          },
        })

        patternsCreated++
      }
    }

    // Check for missed payments and auto-pause
    const patternsPaused = await checkMissedPayments(organizationId)

    revalidatePath("/recurring")
    revalidatePath("/expenses")
    revalidatePath("/dashboard")

    return successResponse({
      patternsDetected: detectedPatterns.length,
      patternsCreated,
      patternsUpdated,
      patternsPaused,
    })
  } catch (error) {
    console.error("Error detecting patterns:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to detect patterns",
      "DETECTION_ERROR"
    )
  }
}
