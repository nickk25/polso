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

export interface PatternsGrouped {
  confirmed: RecurringPatternWithRelations[]
  suggested: RecurringPatternWithRelations[]
  paused: RecurringPatternWithRelations[]
  currency: string
}

export async function getAllPatternsGrouped(organizationId?: string): Promise<PatternsGrouped> {
  const orgId = organizationId ?? (await getAuthContext()).organizationId

  const [patterns, org] = await Promise.all([
    prisma.recurringPattern.findMany({
      where: { organizationId: orgId },
      include: {
        counterparty: { select: { id: true, name: true, logoUrl: true } },
        category: { select: { id: true, name: true, color: true } },
        _count: { select: { entries: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { currency: true },
    }),
  ])

  return {
    // Confirmed+active: most recently seen first
    confirmed: patterns
      .filter((p) => p.isConfirmed && p.isActive)
      .sort((a, b) => (b.lastOccurrence?.getTime() ?? 0) - (a.lastOccurrence?.getTime() ?? 0)),
    // Suggestions: highest confidence first
    suggested: patterns
      .filter((p) => !p.isConfirmed && p.isActive)
      .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0)),
    // Paused: most recently paused first
    paused: patterns
      .filter((p) => p.isConfirmed && !p.isActive)
      .sort((a, b) => (b.pausedAt?.getTime() ?? 0) - (a.pausedAt?.getTime() ?? 0)),
    currency: org?.currency ?? "EUR",
  }
}

export function computeMonthlyTotal(patterns: RecurringPatternWithRelations[]): number {
  return patterns.reduce((total, pattern) => {
    const amount = pattern.expectedAmount ?? 0
    switch (pattern.frequency) {
      case "weekly": return total + amount * 4.33
      case "biweekly": return total + amount * 2.17
      case "monthly": return total + amount
      case "quarterly": return total + amount / 3
      case "yearly": return total + amount / 12
      default: return total + amount
    }
  }, 0)
}
