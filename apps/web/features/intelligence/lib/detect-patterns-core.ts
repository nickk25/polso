import { prisma } from "@/lib/db"
import { detectRecurringPatterns } from "@polso/intelligence"

interface DetectionResult {
  patternsDetected: number
  patternsCreated: number
  patternsUpdated: number
  patternsPaused: number
}

function getNextExpectedDate(lastOccurrence: Date, frequency: string, expectedDayOfMonth: number | null): Date {
  const next = new Date(lastOccurrence)
  switch (frequency) {
    case "weekly": next.setDate(next.getDate() + 7); break
    case "biweekly": next.setDate(next.getDate() + 14); break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      if (expectedDayOfMonth) next.setDate(expectedDayOfMonth)
      break
    case "quarterly": next.setMonth(next.getMonth() + 3); break
    case "yearly": next.setFullYear(next.getFullYear() + 1); break
    default: next.setMonth(next.getMonth() + 1)
  }
  return next
}

async function checkMissedPayments(organizationId: string): Promise<number> {
  const gracePeriodDays = 7
  const today = new Date()

  const activePatterns = await prisma.recurringPattern.findMany({
    where: { organizationId, isActive: true, isConfirmed: true, lastOccurrence: { not: null } },
  })

  let pausedCount = 0
  for (const pattern of activePatterns) {
    if (!pattern.lastOccurrence) continue
    const nextExpected = getNextExpectedDate(pattern.lastOccurrence, pattern.frequency, pattern.expectedDayOfMonth)
    nextExpected.setDate(nextExpected.getDate() + gracePeriodDays)
    if (today > nextExpected) {
      await prisma.recurringPattern.update({
        where: { id: pattern.id },
        data: { isActive: false, pauseReason: "missed_payment", pausedAt: new Date() },
      })
      pausedCount++
    }
  }
  return pausedCount
}

export async function detectPatternsForOrg(organizationId: string): Promise<DetectionResult> {
  const dismissedPatterns = await prisma.dismissedPattern.findMany({
    where: { organizationId },
    select: { counterpartyId: true, patternName: true },
  })

  const dismissedCounterpartyIds = new Set(
    dismissedPatterns.filter((d) => d.counterpartyId).map((d) => d.counterpartyId!)
  )
  const dismissedNames = new Set(dismissedPatterns.map((d) => d.patternName.toLowerCase()))

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      date: { gte: oneYearAgo },
      status: { not: "excluded" },
    },
    include: { counterparty: true },
    orderBy: { date: "asc" },
  })

  const detectedPatterns = detectRecurringPatterns(entries)

  let patternsCreated = 0
  let patternsUpdated = 0

  for (const pattern of detectedPatterns) {
    if (pattern.counterpartyId && dismissedCounterpartyIds.has(pattern.counterpartyId)) continue
    if (dismissedNames.has(pattern.name.toLowerCase())) continue

    const existing = await prisma.recurringPattern.findFirst({
      where: {
        organizationId,
        OR: [
          pattern.counterpartyId ? { counterpartyId: pattern.counterpartyId } : {},
          { name: pattern.name },
        ].filter((o) => Object.keys(o).length > 0),
      },
    })

    if (existing) {
      if (!existing.isActive && existing.isConfirmed) {
        if (existing.pauseReason === "manual") continue

        if (existing.pauseReason === "missed_payment") {
          const hasNewEntry = pattern.lastOccurrence && existing.lastOccurrence &&
            pattern.lastOccurrence > existing.lastOccurrence

          if (hasNewEntry) {
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
            await prisma.entry.updateMany({
              where: { id: { in: pattern.entryIds } },
              data: { recurringPatternId: existing.id, entryType: "fixed" },
            })
            patternsUpdated++
            continue
          }
        }
        continue
      }

      await prisma.recurringPattern.update({
        where: { id: existing.id },
        data: {
          expectedAmount: pattern.expectedAmount,
          amountVariancePct: pattern.amountVariancePct,
          expectedDayOfMonth: pattern.expectedDayOfMonth,
          confidenceScore: pattern.confidenceScore,
          lastOccurrence: pattern.lastOccurrence,
          occurrenceCount: pattern.occurrenceCount,
          frequency: existing.isConfirmed ? existing.frequency : pattern.frequency,
        },
      })
      await prisma.entry.updateMany({
        where: { id: { in: pattern.entryIds } },
        data: { recurringPatternId: existing.id, entryType: "fixed" },
      })
      patternsUpdated++
    } else {
      const newPattern = await prisma.recurringPattern.create({
        data: {
          organizationId,
          name: pattern.name,
          counterpartyId: pattern.counterpartyId,
          frequency: pattern.frequency,
          expectedAmount: pattern.expectedAmount,
          amountVariancePct: pattern.amountVariancePct,
          expectedDayOfMonth: pattern.expectedDayOfMonth,
          categoryId: pattern.categoryId,
          entryType: "fixed",
          isActive: true,
          isConfirmed: false,
          confidenceScore: pattern.confidenceScore,
          firstOccurrence: pattern.firstOccurrence,
          lastOccurrence: pattern.lastOccurrence,
          occurrenceCount: pattern.occurrenceCount,
        },
      })
      await prisma.entry.updateMany({
        where: { id: { in: pattern.entryIds } },
        data: { recurringPatternId: newPattern.id, entryType: "fixed" },
      })
      patternsCreated++
    }
  }

  const patternsPaused = await checkMissedPayments(organizationId)

  return {
    patternsDetected: detectedPatterns.length,
    patternsCreated,
    patternsUpdated,
    patternsPaused,
  }
}
