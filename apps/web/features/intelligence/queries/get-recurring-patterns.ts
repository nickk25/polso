import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface RecurringPatternWithRelations {
  id: string
  name: string
  frequency: string
  expectedAmount: number | null
  amountVariancePct: number
  expectedDayOfMonth: number | null
  entryType: string
  direction: string
  isActive: boolean
  isConfirmed: boolean
  confidenceScore: number | null
  firstOccurrence: Date | null
  lastOccurrence: Date | null
  occurrenceCount: number
  pauseReason: string | null
  pausedAt: Date | null
  createdAt: Date
  counterparty: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    entries: number
  }
}

export async function getRecurringPatterns(options?: {
  confirmed?: boolean
  active?: boolean
}): Promise<RecurringPatternWithRelations[]> {
  const { organizationId } = await getAuthContext()

  const where: Record<string, unknown> = { organizationId }

  if (options?.confirmed !== undefined) {
    where.isConfirmed = options.confirmed
  }

  if (options?.active !== undefined) {
    where.isActive = options.active
  }

  return prisma.recurringPattern.findMany({
    where,
    include: {
      counterparty: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          entries: true,
        },
      },
    },
    orderBy: [
      { isConfirmed: "desc" },
      { confidenceScore: "desc" },
      { lastOccurrence: "desc" },
    ],
  })
}

export async function getRecurringPattern(id: string) {
  const { organizationId } = await getAuthContext()

  return prisma.recurringPattern.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      counterparty: true,
      category: true,
      entries: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  })
}

export async function getSuggestedPatterns(): Promise<RecurringPatternWithRelations[]> {
  return getRecurringPatterns({ confirmed: false, active: true })
}

export async function getConfirmedPatterns(): Promise<RecurringPatternWithRelations[]> {
  return getRecurringPatterns({ confirmed: true, active: true })
}

export async function getPausedPatterns(): Promise<RecurringPatternWithRelations[]> {
  return getRecurringPatterns({ confirmed: true, active: false })
}

export async function getMonthlyRecurringTotal(): Promise<number> {
  const { organizationId } = await getAuthContext()

  const patterns = await prisma.recurringPattern.findMany({
    where: {
      organizationId,
      isConfirmed: true,
      isActive: true,
    },
    select: {
      expectedAmount: true,
      frequency: true,
    },
  })

  return patterns.reduce((total, pattern) => {
    const amount = pattern.expectedAmount || 0
    switch (pattern.frequency) {
      case "weekly":
        return total + amount * 4.33
      case "biweekly":
        return total + amount * 2.17
      case "monthly":
        return total + amount
      case "quarterly":
        return total + amount / 3
      case "yearly":
        return total + amount / 12
      default:
        return total + amount
    }
  }, 0)
}
