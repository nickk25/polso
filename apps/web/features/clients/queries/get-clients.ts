import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export interface ClientWithStats {
  id: string
  name: string
  normalizedName: string
  logoUrl: string | null
  website: string | null
  taxId: string | null
  defaultCategoryId: string | null
  isAutoDetected: boolean
  detectionPatterns: string[]
  createdAt: Date
  defaultCategory: {
    id: string
    name: string
    color: string
  } | null
  _count: {
    incomes: number
  }
  totalReceived: number
  lastIncomeDate: Date | null
}

/**
 * Get all clients for the current organization with stats
 */
export async function getClients(): Promise<ClientWithStats[]> {
  const { organizationId } = await getAuthContext()

  // Get clients with income count
  const clients = await prisma.client.findMany({
    where: { organizationId },
    include: {
      defaultCategory: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          incomes: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Get aggregate stats for each client
  const clientIds = clients.map((c) => c.id)

  const statsResult = await prisma.income.groupBy({
    by: ["clientId"],
    where: {
      clientId: { in: clientIds },
    },
    _sum: {
      amount: true,
    },
    _max: {
      date: true,
    },
  })

  // Create a lookup map for stats
  const statsMap = new Map(
    statsResult.map((s) => [
      s.clientId,
      {
        totalReceived: s._sum.amount || 0,
        lastIncomeDate: s._max.date,
      },
    ])
  )

  // Combine client data with stats
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    normalizedName: client.normalizedName,
    logoUrl: client.logoUrl,
    website: client.website,
    taxId: client.taxId,
    defaultCategoryId: client.defaultCategoryId,
    isAutoDetected: client.isAutoDetected,
    detectionPatterns: client.detectionPatterns,
    createdAt: client.createdAt,
    defaultCategory: client.defaultCategory,
    _count: client._count,
    totalReceived: statsMap.get(client.id)?.totalReceived || 0,
    lastIncomeDate: statsMap.get(client.id)?.lastIncomeDate || null,
  }))
}

/**
 * Get a single client by ID with full details
 */
export async function getClientById(id: string): Promise<ClientWithStats | null> {
  const { organizationId } = await getAuthContext()

  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      defaultCategory: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          incomes: true,
        },
      },
    },
  })

  if (!client) return null

  // Get aggregate stats for this client
  const stats = await prisma.income.aggregate({
    where: {
      clientId: client.id,
    },
    _sum: {
      amount: true,
    },
    _max: {
      date: true,
    },
  })

  return {
    id: client.id,
    name: client.name,
    normalizedName: client.normalizedName,
    logoUrl: client.logoUrl,
    website: client.website,
    taxId: client.taxId,
    defaultCategoryId: client.defaultCategoryId,
    isAutoDetected: client.isAutoDetected,
    detectionPatterns: client.detectionPatterns,
    createdAt: client.createdAt,
    defaultCategory: client.defaultCategory,
    _count: client._count,
    totalReceived: stats._sum.amount || 0,
    lastIncomeDate: stats._max.date || null,
  }
}
