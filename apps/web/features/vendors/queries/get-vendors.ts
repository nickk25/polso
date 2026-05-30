import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

function toVendorWithStats(
  cp: Omit<VendorWithStats, "totalSpent" | "lastEntryDate">,
  totalSpent: number,
  lastEntryDate: Date | null
): VendorWithStats {
  return { ...cp, totalSpent, lastEntryDate }
}

export interface VendorWithStats {
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

export async function getVendors(): Promise<VendorWithStats[]> {
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
    return toVendorWithStats(cp, stats?.totalSpent || 0, stats?.lastEntryDate || null)
  })
}

export async function getVendorById(id: string): Promise<VendorWithStats | null> {
  const { organizationId } = await getAuthContext()

  const cp = await prisma.counterparty.findFirst({
    where: { id, organizationId },
    include: {
      defaultCategory: {
        select: { id: true, name: true, color: true },
      },
      _count: {
        select: { entries: true },
      },
    },
  })

  if (!cp) return null

  const stats = await prisma.entry.aggregate({
    where: { counterpartyId: cp.id, direction: "expense" },
    _sum: { amount: true },
    _max: { date: true },
  })

  return toVendorWithStats(cp, stats._sum.amount || 0, stats._max.date || null)
}
