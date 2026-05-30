import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface CounterpartyWithStats {
  id: string
  name: string
  normalizedName: string
  logoUrl: string | null
  website: string | null
  taxId: string | null
  defaultCategoryId: string | null
  defaultEntryType: string | null
  isAutoDetected: boolean
  detectionPatterns: string[]
  createdAt: Date
  defaultCategory: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    entries: number
  }
  totalSpent: number
  lastEntryDate: Date | null
}

function toCounterpartyWithStats(
  cp: Omit<CounterpartyWithStats, "totalSpent" | "lastEntryDate">,
  totalSpent: number,
  lastEntryDate: Date | null
): CounterpartyWithStats {
  return { ...cp, totalSpent, lastEntryDate }
}

export async function getCounterparties(): Promise<CounterpartyWithStats[]> {
  const { organizationId } = await getAuthContext()

  const counterparties = await prisma.counterparty.findMany({
    where: { organizationId },
    include: {
      defaultCategory: {
        select: { id: true, name: true, color: true },
      },
      _count: {
        select: { entries: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const counterpartyIds = counterparties.map((c) => c.id)

  const statsResult = await prisma.entry.groupBy({
    by: ["counterpartyId"],
    where: {
      counterpartyId: { in: counterpartyIds },
      direction: "expense",
    },
    _sum: { amount: true },
    _max: { date: true },
  })

  const statsMap = new Map(
    statsResult.map((s) => [
      s.counterpartyId,
      { totalSpent: s._sum.amount || 0, lastEntryDate: s._max.date },
    ])
  )

  return counterparties.map((cp) => {
    const stats = statsMap.get(cp.id)
    return toCounterpartyWithStats(cp, stats?.totalSpent || 0, stats?.lastEntryDate || null)
  })
}

export async function getCounterpartyById(id: string): Promise<CounterpartyWithStats | null> {
  const { organizationId } = await getAuthContext()

  const [cp, stats] = await Promise.all([
    prisma.counterparty.findFirst({
      where: { id, organizationId },
      include: {
        defaultCategory: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { entries: true },
        },
      },
    }),
    prisma.entry.aggregate({
      where: { counterpartyId: id, direction: "expense" },
      _sum: { amount: true },
      _max: { date: true },
    }),
  ])

  if (!cp) return null

  return toCounterpartyWithStats(cp, stats._sum.amount || 0, stats._max.date || null)
}

export async function getOrgCurrency(): Promise<string> {
  const { organizationId } = await getAuthContext()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true },
  })
  return org?.currency ?? "EUR"
}
