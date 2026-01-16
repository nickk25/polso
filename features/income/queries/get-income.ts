import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export interface IncomeFilters {
  dateFrom?: Date
  dateTo?: Date
  categoryId?: string
  source?: string
  status?: string
  search?: string
}

export interface IncomeWithRelations {
  id: string
  amount: number
  currency: string
  date: Date
  description: string | null
  source: string
  isRecurring: boolean
  status: string
  notes: string | null
  transaction: {
    id: string
    merchantName: string | null
    name: string | null
    category: string | null
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
}

export async function getIncomes(
  filters: IncomeFilters = {},
  page = 1,
  pageSize = 50
): Promise<{ incomes: IncomeWithRelations[]; total: number; pages: number }> {
  const { organizationId } = await getAuthContext()

  const where: Record<string, unknown> = { organizationId }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) (where.date as Record<string, Date>).gte = filters.dateFrom
    if (filters.dateTo) (where.date as Record<string, Date>).lte = filters.dateTo
  }

  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.source) where.source = filters.source
  if (filters.status) where.status = filters.status

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { transaction: { merchantName: { contains: filters.search, mode: "insensitive" } } },
      { transaction: { name: { contains: filters.search, mode: "insensitive" } } },
    ]
  }

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where,
      include: {
        transaction: {
          select: {
            id: true,
            merchantName: true,
            name: true,
            category: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.income.count({ where }),
  ])

  return {
    incomes: incomes as IncomeWithRelations[],
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export interface IncomeStats {
  totalThisMonth: number
  totalLastMonth: number
  incomeCount: number
  monthOverMonthChange: number
  bySource: { source: string; total: number }[]
}

export async function getIncomeStats(): Promise<IncomeStats> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [thisMonth, lastMonth, count, bySource] = await Promise.all([
    prisma.income.aggregate({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: {
        organizationId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.income.count({
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
    }),
    prisma.income.groupBy({
      by: ["source"],
      where: {
        organizationId,
        date: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
  ])

  const totalThisMonth = thisMonth._sum.amount || 0
  const totalLastMonth = lastMonth._sum.amount || 0
  const monthOverMonthChange =
    totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0

  return {
    totalThisMonth,
    totalLastMonth,
    incomeCount: count,
    monthOverMonthChange,
    bySource: bySource.map((item) => ({
      source: item.source,
      total: item._sum.amount || 0,
    })),
  }
}

export async function getRecentIncomes(limit = 10): Promise<IncomeWithRelations[]> {
  const { organizationId } = await getAuthContext()

  const incomes = await prisma.income.findMany({
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
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return incomes as IncomeWithRelations[]
}

export interface MonthlyIncomeTrend {
  month: string
  total: number
  bySource: { source: string; total: number }[]
}

export async function getMonthlyIncomeTrend(months = 6): Promise<MonthlyIncomeTrend[]> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const trends: MonthlyIncomeTrend[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

    const [total, bySource] = await Promise.all([
      prisma.income.aggregate({
        where: {
          organizationId,
          date: { gte: monthStart, lte: monthEnd },
          status: { not: "excluded" },
        },
        _sum: { amount: true },
      }),
      prisma.income.groupBy({
        by: ["source"],
        where: {
          organizationId,
          date: { gte: monthStart, lte: monthEnd },
          status: { not: "excluded" },
        },
        _sum: { amount: true },
      }),
    ])

    trends.push({
      month: format(monthDate, "MMM yyyy"),
      total: total._sum.amount || 0,
      bySource: bySource.map((item) => ({
        source: item.source,
        total: item._sum.amount || 0,
      })),
    })
  }

  return trends
}
