import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

export interface ClientTransaction {
  id: string
  date: Date
  name: string | null
  merchantName: string | null
  amount: number
  currency: string
  pending: boolean
  accountName: string
  expenseStatus: string | null
  expenseType: string | null
  inboxItems: Array<{ id: string; fileName: string; status: string; source: string }>
}

export interface TransactionFilters {
  page?: number
  pageSize?: number
  from?: Date
  to?: Date
  search?: string
  receiptStatus?: "con_recibo" | "sin_recibo"
}

export interface TransactionStats {
  totalThisMonth: number
  totalLastMonth: number
  countWithReceipt: number
  countPending: number
}

async function verifyPartnerLink(partnerId: string, clientId: string) {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()
}

function buildWhere(clientId: string, filters: TransactionFilters) {
  const { from, to, search, receiptStatus } = filters
  return {
    organizationId: clientId,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { merchantName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(receiptStatus === "con_recibo"
      ? { expense: { status: "documented" } }
      : receiptStatus === "sin_recibo"
        ? { NOT: { expense: { status: "documented" } } }
        : {}),
  }
}

export async function getClientTransactions(
  partnerId: string,
  clientId: string,
  filters: TransactionFilters = {}
): Promise<{ items: ClientTransaction[]; total: number; pages: number }> {
  await verifyPartnerLink(partnerId, clientId)

  const { page = 1, pageSize = 50 } = filters
  const where = buildWhere(clientId, filters)

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        name: true,
        merchantName: true,
        amount: true,
        currency: true,
        pending: true,
        account: { select: { name: true } },
        expense: { select: { status: true, expenseType: true } },
        inboxItems: {
          select: { id: true, fileName: true, status: true, source: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    total,
    pages: Math.ceil(total / pageSize),
    items: transactions.map((t) => ({
      ...t,
      accountName: t.account.name,
      expenseStatus: t.expense?.status ?? null,
      expenseType: t.expense?.expenseType ?? null,
    })),
  }
}

export async function getClientTransactionStats(
  partnerId: string,
  clientId: string
): Promise<TransactionStats> {
  await verifyPartnerLink(partnerId, clientId)

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Tink convention: positive amount = money out (debit/expense), negative = money in (credit)
  const baseWhere = { organizationId: clientId, amount: { gt: 0 } }

  const [thisMonth, lastMonth, withReceipt, pending] = await Promise.all([
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
        expense: { status: "documented" },
      },
    }),
    prisma.transaction.count({
      where: {
        organizationId: clientId,
        amount: { gt: 0 },
        NOT: { expense: { status: "documented" } },
      },
    }),
  ])

  return {
    totalThisMonth: Math.abs(thisMonth._sum.amount ?? 0),
    totalLastMonth: Math.abs(lastMonth._sum.amount ?? 0),
    countWithReceipt: withReceipt,
    countPending: pending,
  }
}
