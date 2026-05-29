import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { startOfMonth } from "date-fns"

export type TransactionType = "expense" | "income"

export interface TransactionFilters {
  type?: TransactionType | "all"
  dateFrom?: Date
  dateTo?: Date
  categoryId?: string
  status?: string
  search?: string
}

export interface TransactionRow {
  id: string
  type: TransactionType
  date: Date
  description: string | null
  amount: number
  currency: string
  status: string
  category: { id: string; name: string; color: string } | null
  vendor: { id: string; name: string } | null
  expenseType: string | null
  source: string | null
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

  const dateFrom = filters.dateFrom
  const dateTo = filters.dateTo

  const dateFilter = dateFrom || dateTo
    ? {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
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

  const fetchExpenses = !filters.type || filters.type === "all" || filters.type === "expense"
  const fetchIncome = !filters.type || filters.type === "all" || filters.type === "income"

  const [expensesResult, incomesResult] = await Promise.all([
    fetchExpenses
      ? prisma.expense.findMany({
          where: {
            organizationId,
            ...(dateFilter && { date: dateFilter }),
            ...(filters.status && { status: filters.status }),
            ...categoryFilter,
            ...searchFilter,
          },
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            currency: true,
            status: true,
            expenseType: true,
            category: { select: { id: true, name: true, color: true } },
            vendor: { select: { id: true, name: true } },
            transaction: { select: { merchantName: true, name: true } },
          },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    fetchIncome
      ? prisma.income.findMany({
          where: {
            organizationId,
            ...(dateFilter && { date: dateFilter }),
            ...(filters.status && { status: filters.status }),
            ...categoryFilter,
            ...searchFilter,
          },
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            currency: true,
            status: true,
            source: true,
            category: { select: { id: true, name: true, color: true } },
            transaction: { select: { merchantName: true, name: true } },
          },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ])

  const rows: TransactionRow[] = [
    ...expensesResult.map((e) => ({
      id: e.id,
      type: "expense" as const,
      date: e.date,
      description: e.transaction?.merchantName ?? e.transaction?.name ?? e.description,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      category: e.category,
      vendor: e.vendor,
      expenseType: e.expenseType,
      source: null,
    })),
    ...incomesResult.map((i) => ({
      id: i.id,
      type: "income" as const,
      date: i.date,
      description: i.transaction?.merchantName ?? i.transaction?.name ?? i.description,
      amount: i.amount,
      currency: i.currency,
      status: i.status,
      category: i.category,
      vendor: null,
      expenseType: null,
      source: i.source,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const total = rows.length
  const pages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const paginated = rows.slice(start, start + pageSize)

  return { transactions: paginated, total, pages }
}

export async function getTransactionStats(): Promise<TransactionStats> {
  const { organizationId } = await getAuthContext()
  const monthStart = startOfMonth(new Date())

  const [expenseAgg, incomeAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { organizationId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { organizationId, date: { gte: monthStart } },
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
