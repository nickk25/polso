import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface VaultItem {
  id: string
  fileName: string
  displayName: string | null
  amount: number | null
  currency: string
  date: Date | null
  status: string
  source: string
  createdAt: Date
  transaction: {
    id: string
    description: string | null
    amount: number
    date: Date
    merchantName: string | null
  } | null
}

export interface VaultStats {
  total: number
  matched: number
  unmatched: number
  suggested: number
}

export async function getVaultItems(
  statusFilter?: string,
  page = 1,
  pageSize = 50
): Promise<{ items: VaultItem[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  const where: Record<string, unknown> = {
    organizationId,
    status: { not: "archived" },
  }

  if (statusFilter && statusFilter !== "all") {
    where.status = statusFilter
  }

  const [items, total] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      select: {
        id: true,
        fileName: true,
        displayName: true,
        amount: true,
        currency: true,
        date: true,
        status: true,
        source: true,
        createdAt: true,
        transaction: {
          select: {
            id: true,
            name: true,
            merchantName: true,
            amount: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inboxItem.count({ where }),
  ])

  return {
    items: items.map((item) => ({
      ...item,
      amount: item.amount ? Number(item.amount) : null,
      transaction: item.transaction
        ? {
            id: item.transaction.id,
            description: item.transaction.name,
            amount: item.transaction.amount,
            date: item.transaction.date,
            merchantName: item.transaction.merchantName,
          }
        : null,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export async function getVaultStats(): Promise<VaultStats> {
  const { organizationId } = await getAuthContext()

  const base = { organizationId, status: { not: "archived" } }

  const [total, matched, unmatched, suggested] = await Promise.all([
    prisma.inboxItem.count({ where: base }),
    prisma.inboxItem.count({ where: { ...base, status: "done" } }),
    prisma.inboxItem.count({ where: { ...base, status: "no_match" } }),
    prisma.inboxItem.count({ where: { ...base, status: "suggested_match" } }),
  ])

  return { total, matched, unmatched, suggested }
}
