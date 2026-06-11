import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface VaultTransactionRef {
  id: string
  description: string | null
  amount: number
  date: Date
  merchantName: string | null
}

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
  transaction: VaultTransactionRef | null
  matchSuggestion: {
    id: string
    confidenceScore: number
    transactionId: string
    transaction: VaultTransactionRef
  } | null
  // Present only for legacy TransactionDocument records — actions differ
  legacyDocId?: string
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
  pageSize = 50,
  organizationId?: string
): Promise<{ items: VaultItem[]; total: number; pages: number }> {
  const orgId = organizationId ?? (await getAuthContext()).organizationId

  const inboxWhere: Record<string, unknown> = {
    organizationId: orgId,
    status: { not: "archived" },
  }

  if (statusFilter && statusFilter !== "all") {
    inboxWhere.status = statusFilter
  }

  // Legacy TransactionDocuments are always "done", so only include them on "all" or "done" filters
  const includeLegacy = !statusFilter || statusFilter === "all" || statusFilter === "done"

  // Fetch all in memory and merge — MVP data sets are small
  const [inboxItems, legacyDocs] = await Promise.all([
    prisma.inboxItem.findMany({
      where: inboxWhere,
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
          select: { id: true, name: true, merchantName: true, amount: true, date: true },
        },
        matchSuggestions: {
          where: { status: "pending" },
          select: {
            id: true,
            confidenceScore: true,
            transactionId: true,
            transaction: {
              select: { id: true, name: true, merchantName: true, amount: true, date: true },
            },
          },
          orderBy: { confidenceScore: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    includeLegacy
      ? prisma.transactionDocument.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            fileName: true,
            totalAmount: true,
            invoiceDate: true,
            createdAt: true,
            transaction: {
              select: { id: true, name: true, merchantName: true, amount: true, date: true, currency: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  const mappedInbox: VaultItem[] = inboxItems.map((item) => {
    const ms = item.matchSuggestions[0]
    return {
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
      matchSuggestion: ms
        ? {
            id: ms.id,
            confidenceScore: ms.confidenceScore,
            transactionId: ms.transactionId,
            transaction: {
              id: ms.transaction.id,
              description: ms.transaction.name,
              amount: ms.transaction.amount,
              date: ms.transaction.date,
              merchantName: ms.transaction.merchantName,
            },
          }
        : null,
    }
  })

  const mappedLegacy: VaultItem[] = legacyDocs
    .filter((doc) => doc.transaction != null)
    .map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      displayName: null,
      amount: doc.totalAmount ?? null,
      currency: doc.transaction!.currency,
      date: doc.invoiceDate,
      status: "done",
      source: "upload",
      createdAt: doc.createdAt,
      transaction: {
        id: doc.transaction!.id,
        description: doc.transaction!.name,
        amount: doc.transaction!.amount,
        date: doc.transaction!.date,
        merchantName: doc.transaction!.merchantName,
      },
      matchSuggestion: null,
      legacyDocId: doc.id,
    }))

  const all = [...mappedInbox, ...mappedLegacy].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )

  const total = all.length
  return {
    items: all.slice((page - 1) * pageSize, page * pageSize),
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export async function getVaultStats(): Promise<VaultStats> {
  const { organizationId } = await getAuthContext()

  const base = { organizationId, status: { not: "archived" } }

  const [inboxTotal, matched, unmatched, suggested, legacyCount] = await Promise.all([
    prisma.inboxItem.count({ where: base }),
    prisma.inboxItem.count({ where: { ...base, status: "done" } }),
    prisma.inboxItem.count({ where: { ...base, status: "no_match" } }),
    prisma.inboxItem.count({ where: { ...base, status: "suggested_match" } }),
    prisma.transactionDocument.count({ where: { organizationId } }),
  ])

  return {
    total: inboxTotal + legacyCount,
    matched: matched + legacyCount,
    unmatched,
    suggested,
  }
}
