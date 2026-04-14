import { prisma, transactionDocumentedWhere, transactionNotDocumentedWhere } from "@polso/db"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { notFound } from "next/navigation"

export interface ClientOverview {
  totalThisMonth: number
  totalLastMonth: number
  countWithReceipt: number
  countPending: number
  coveragePct: number | null
  pendingSuggestionsCount: number
  topSuggestions: Array<{
    id: string
    confidenceScore: number
    matchType: string
    transaction: {
      name: string | null
      merchantName: string | null
      amount: number
      currency: string
      date: Date
    }
    inboxItem: {
      fileName: string
      displayName: string | null
      amount: unknown
      currency: string
    }
  }>
  pendingInboxCount: number
  recentPendingInbox: Array<{
    id: string
    fileName: string
    displayName: string | null
    amount: unknown
    currency: string
    source: string
    createdAt: Date
  }>
}

export async function getClientOverview(
  partnerId: string,
  clientId: string
): Promise<ClientOverview> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const baseWhere = { organizationId: clientId, amount: { gt: 0 } }

  const [
    thisMonthAgg,
    lastMonthAgg,
    countWithReceipt,
    countPending,
    pendingSuggestionsCount,
    topSuggestions,
    pendingInboxCount,
    recentPendingInbox,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...baseWhere, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...baseWhere, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: {
        organizationId: clientId,
        amount: { gt: 0 },
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        ...transactionDocumentedWhere,
      },
    }),
    prisma.transaction.count({
      where: {
        organizationId: clientId,
        amount: { gt: 0 },
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        ...transactionNotDocumentedWhere,
      },
    }),
    prisma.matchSuggestion.count({
      where: { organizationId: clientId, status: "pending" },
    }),
    prisma.matchSuggestion.findMany({
      where: { organizationId: clientId, status: "pending" },
      orderBy: { confidenceScore: "desc" },
      take: 5,
      select: {
        id: true,
        confidenceScore: true,
        matchType: true,
        transaction: {
          select: { name: true, merchantName: true, amount: true, currency: true, date: true },
        },
        inboxItem: {
          select: { fileName: true, displayName: true, amount: true, currency: true },
        },
      },
    }),
    prisma.inboxItem.count({
      where: { organizationId: clientId, status: { in: ["new", "no_match"] } },
    }),
    prisma.inboxItem.findMany({
      where: { organizationId: clientId, status: { in: ["new", "no_match"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fileName: true,
        displayName: true,
        amount: true,
        currency: true,
        source: true,
        createdAt: true,
      },
    }),
  ])

  const totalThisMonth = Math.abs(thisMonthAgg._sum.amount ?? 0)
  const totalLastMonth = Math.abs(lastMonthAgg._sum.amount ?? 0)
  const totalTransactions = countWithReceipt + countPending
  const coveragePct = totalTransactions > 0
    ? Math.round((countWithReceipt / totalTransactions) * 100)
    : null

  return {
    totalThisMonth,
    totalLastMonth,
    countWithReceipt,
    countPending,
    coveragePct,
    pendingSuggestionsCount,
    topSuggestions,
    pendingInboxCount,
    recentPendingInbox,
  }
}
