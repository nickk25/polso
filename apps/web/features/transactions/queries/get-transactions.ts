import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { startOfMonth } from "date-fns"

export type TransactionDirection = "expense" | "income"

export interface TransactionFilters {
  direction?: TransactionDirection | "all"
  dateFrom?: Date
  dateTo?: Date
  categoryId?: string
  status?: string
  search?: string
  noVat?: boolean
}

export interface TransactionRow {
  id: string
  direction: TransactionDirection
  transactionId: string | null
  date: Date
  description: string | null
  amount: number
  currency: string
  status: string
  category: { id: string; name: string; color: string } | null
  counterparty: { id: string; name: string } | null
  entryType: string | null
  taxRate: number | null
  taxAmount: number | null
}

export interface TransactionStats {
  totalExpenses: number
  totalIncome: number
  netFlow: number
  currency: string
}

export async function getTransactions(
  filters: TransactionFilters = {},
  page = 1,
  pageSize = 50
): Promise<{ transactions: TransactionRow[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        }
      : undefined

  const searchFilter = filters.search
    ? {
        OR: [
          { description: { contains: filters.search, mode: "insensitive" as const } },
          { transaction: { merchantName: { contains: filters.search, mode: "insensitive" as const } } },
          { transaction: { name: { contains: filters.search, mode: "insensitive" as const } } },
        ],
      }
    : {}

  const categoryFilter =
    filters.categoryId === "none"
      ? { categoryId: null }
      : filters.categoryId
        ? { categoryId: filters.categoryId }
        : {}

  const directionFilter =
    filters.direction && filters.direction !== "all"
      ? { direction: filters.direction }
      : {}

  const statusFilter = filters.status ? { status: filters.status } : {}
  const noVatFilter = filters.noVat ? { taxRate: null } : {}

  const where = {
    organizationId,
    ...(dateFilter && { date: dateFilter }),
    ...directionFilter,
    ...statusFilter,
    ...categoryFilter,
    ...searchFilter,
    ...noVatFilter,
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      select: {
        id: true,
        direction: true,
        transactionId: true,
        date: true,
        description: true,
        amount: true,
        currency: true,
        status: true,
        entryType: true,
        taxRate: true,
        taxAmount: true,
        category: { select: { id: true, name: true, color: true } },
        counterparty: { select: { id: true, name: true } },
        transaction: { select: { merchantName: true, name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.entry.count({ where }),
  ])

  const transactions: TransactionRow[] = entries.map((e) => ({
    id: e.id,
    direction: e.direction as TransactionDirection,
    transactionId: e.transactionId ?? null,
    date: e.date,
    description: e.transaction?.merchantName ?? e.transaction?.name ?? e.description,
    amount: e.amount,
    currency: e.currency,
    status: e.status,
    category: e.category,
    counterparty: e.counterparty,
    entryType: e.entryType,
    taxRate: e.taxRate,
    taxAmount: e.taxAmount,
  }))

  return { transactions, total, pages: Math.ceil(total / pageSize) }
}

export async function getTransactionStats(): Promise<TransactionStats> {
  const { organizationId } = await getAuthContext()
  const monthStart = startOfMonth(new Date())

  const [expenseAgg, incomeAgg] = await Promise.all([
    prisma.entry.aggregate({
      where: { organizationId, direction: "expense", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.entry.aggregate({
      where: { organizationId, direction: "income", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ])

  const totalExpenses = expenseAgg._sum.amount ?? 0
  const totalIncome = incomeAgg._sum.amount ?? 0

  return {
    totalExpenses,
    totalIncome,
    netFlow: totalIncome - totalExpenses,
    currency: "EUR",
  }
}
