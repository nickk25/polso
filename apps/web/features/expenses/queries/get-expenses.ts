import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

export interface ExpenseFilters {
  dateFrom?: Date
  dateTo?: Date
  categoryId?: string
  vendorId?: string
  status?: string
  expenseType?: string
  search?: string
}

export interface ExpenseWithRelations {
  id: string
  amount: number
  currency: string
  date: Date
  description: string | null
  expenseType: string
  status: string
  isManual: boolean
  categorySource: string | null
  categoryConfidence: number | null
  transaction: {
    id: string
    merchantName: string | null
    name: string | null
    category: string | null
    inboxItems: Array<{ id: string }>
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
  vendor: {
    id: string
    name: string
    logoUrl: string | null
  } | null
  _count: {
    invoices: number
  }
}

export async function getExpenses(
  filters: ExpenseFilters = {},
  page = 1,
  pageSize = 50
): Promise<{ expenses: ExpenseWithRelations[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  const where: Record<string, unknown> = { organizationId }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) (where.date as Record<string, Date>).gte = filters.dateFrom
    if (filters.dateTo) (where.date as Record<string, Date>).lte = filters.dateTo
  }

  if (filters.categoryId === "none") {
    where.categoryId = null
  } else if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }
  if (filters.vendorId) where.vendorId = filters.vendorId
  if (filters.status) where.status = filters.status
  if (filters.expenseType) where.expenseType = filters.expenseType

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { transaction: { merchantName: { contains: filters.search, mode: "insensitive" } } },
      { transaction: { name: { contains: filters.search, mode: "insensitive" } } },
      { vendor: { name: { contains: filters.search, mode: "insensitive" } } },
    ]
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        transaction: {
          select: {
            id: true,
            merchantName: true,
            name: true,
            category: true,
            inboxItems: { select: { id: true } },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ])

  return {
    expenses: expenses as ExpenseWithRelations[],
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export interface ExpenseStats {
  totalThisMonth: number
  totalLastMonth: number
  fixedThisMonth: number
  variableThisMonth: number
  expenseCount: number
  monthOverMonthChange: number
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [thisMonth, lastMonth, fixed, variable, count] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        expenseType: "fixed",
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        expenseType: "variable",
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
    }),
  ])

  const totalThisMonth = thisMonth._sum.amount || 0
  const totalLastMonth = lastMonth._sum.amount || 0
  const monthOverMonthChange =
    totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0

  return {
    totalThisMonth,
    totalLastMonth,
    fixedThisMonth: fixed._sum.amount || 0,
    variableThisMonth: variable._sum.amount || 0,
    expenseCount: count,
    monthOverMonthChange,
  }
}

export async function getRecentExpenses(limit = 10): Promise<ExpenseWithRelations[]> {
  const { organizationId } = await getAuthContext()

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      status: { not: "excluded" },
    },
    include: {
      transaction: {
        select: {
          id: true,
          merchantName: true,
          name: true,
          category: true,
          inboxItems: { select: { id: true } },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      vendor: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      _count: {
        select: {
          invoices: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return expenses as ExpenseWithRelations[]
}
