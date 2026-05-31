import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { startOfMonth, endOfMonth, subMonths, format, getQuarter } from "date-fns"
import { getFiscalQuarters, getCurrentQuarterNumber } from "@/features/analytics/lib/quarters"

export interface BurnRateData {
  burnRate: number
  runway: number
  totalBalance: number
  currency: string
}

export async function getBurnRateAndRunway(): Promise<BurnRateData> {
  const { organizationId } = await getAuthContext()

  const accounts = await prisma.account.findMany({
    where: { organizationId, status: "active" },
    select: { balanceCurrent: true, currency: true },
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balanceCurrent || 0), 0)
  const currency = accounts[0]?.currency || "EUR"

  const now = new Date()
  const threeMonthsAgo = startOfMonth(subMonths(now, 3))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const monthlyExpenses = await prisma.entry.groupBy({
    by: ["date"],
    where: {
      organizationId,
      direction: "expense",
      date: { gte: threeMonthsAgo, lte: lastMonthEnd },
      status: { not: "excluded" },
    },
    _sum: { amount: true },
  })

  const monthlyTotals = new Map<string, number>()
  for (const expense of monthlyExpenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + (expense._sum.amount || 0))
  }

  const monthCount = monthlyTotals.size || 1
  const totalSpent = Array.from(monthlyTotals.values()).reduce((sum, v) => sum + v, 0)
  const burnRate = totalSpent / monthCount
  const runway = burnRate > 0 ? totalBalance / burnRate : 0

  return { burnRate, runway, totalBalance, currency }
}

export interface MonthlySpend {
  month: string
  total: number
  fixed: number
  variable: number
}

export async function getMonthlySpendTrend(months = 6, endMonth = new Date()): Promise<MonthlySpend[]> {
  const { organizationId } = await getAuthContext()

  const now = endMonth
  const startDate = startOfMonth(subMonths(now, months - 1))
  const endDate = endOfMonth(now)

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      date: { gte: startDate, lte: endDate },
      status: { not: "excluded" },
    },
    select: { amount: true, date: true, entryType: true },
  })

  const monthlyData = new Map<string, { total: number; fixed: number; variable: number }>()
  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    monthlyData.set(format(monthDate, "yyyy-MM"), { total: 0, fixed: 0, variable: 0 })
  }

  for (const entry of entries) {
    const monthKey = format(new Date(entry.date), "yyyy-MM")
    const data = monthlyData.get(monthKey)
    if (data) {
      data.total += entry.amount
      if (entry.entryType === "fixed") data.fixed += entry.amount
      else data.variable += entry.amount
    }
  }

  return Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: format(new Date(month + "-01"), "MMM"),
      ...data,
    }))
}

export interface CategoryBreakdown {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  total: number
  percentage: number
  count: number
}

async function getCategoryBreakdownForDirection(
  organizationId: string,
  direction: "expense" | "income",
  date: Date
): Promise<CategoryBreakdown[]> {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const grouped = await prisma.entry.groupBy({
    by: ["categoryId"],
    where: { organizationId, direction, date: { gte: monthStart, lte: monthEnd }, status: { not: "excluded" } },
    _sum: { amount: true },
    _count: { _all: true },
  })

  const categoryIds = grouped.flatMap(g => g.categoryId ? [g.categoryId] : [])
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, color: true } })
    : []
  const catMap = new Map(categories.map(c => [c.id, c]))

  const grandTotal = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0)
  return grouped
    .map(g => {
      const cat = g.categoryId ? catMap.get(g.categoryId) : undefined
      const total = g._sum.amount ?? 0
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? "Uncategorized",
        categoryColor: cat?.color ?? "#6b7280",
        total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        count: g._count._all,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export async function getCategoryBreakdown(date = new Date()): Promise<CategoryBreakdown[]> {
  const { organizationId } = await getAuthContext()
  return getCategoryBreakdownForDirection(organizationId, "expense", date)
}

export async function getIncomeCategoryBreakdown(date = new Date()): Promise<CategoryBreakdown[]> {
  const { organizationId } = await getAuthContext()
  return getCategoryBreakdownForDirection(organizationId, "income", date)
}

export interface TopCounterparty {
  counterpartyId: string | null
  counterpartyName: string
  total: number
  count: number
  percentage: number
}

export async function getTopCounterparties(limit = 10, date = new Date()): Promise<TopCounterparty[]> {
  const { organizationId } = await getAuthContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const grouped = await prisma.entry.groupBy({
    by: ["counterpartyId"],
    where: { organizationId, direction: "expense", date: { gte: monthStart, lte: monthEnd }, status: { not: "excluded" } },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  })

  const counterpartyIds = grouped.flatMap(g => g.counterpartyId ? [g.counterpartyId] : [])
  const counterparties = counterpartyIds.length > 0
    ? await prisma.counterparty.findMany({ where: { id: { in: counterpartyIds } }, select: { id: true, name: true } })
    : []
  const cpMap = new Map(counterparties.map(c => [c.id, c]))

  const grandTotal = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0)
  return grouped.map(g => {
    const cp = g.counterpartyId ? cpMap.get(g.counterpartyId) : undefined
    const total = g._sum.amount ?? 0
    return {
      counterpartyId: g.counterpartyId,
      counterpartyName: cp?.name ?? "Unknown",
      total,
      count: g._count._all,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }
  })
}

export interface CashFlowData {
  month: string
  inflow: number
  outflow: number
  net: number
}

export interface ExpenseStatsForMonth {
  total: number
  lastMonthTotal: number
  monthOverMonthChange: number
}

export async function getExpenseStatsForMonth(date = new Date()): Promise<ExpenseStatsForMonth> {
  const { organizationId } = await getAuthContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const prevMonthStart = startOfMonth(subMonths(date, 1))
  const prevMonthEnd = endOfMonth(subMonths(date, 1))

  const [current, previous] = await Promise.all([
    prisma.entry.aggregate({
      where: { organizationId, direction: "expense", date: { gte: monthStart, lte: monthEnd }, status: { not: "excluded" } },
      _sum: { amount: true },
    }),
    prisma.entry.aggregate({
      where: { organizationId, direction: "expense", date: { gte: prevMonthStart, lte: prevMonthEnd }, status: { not: "excluded" } },
      _sum: { amount: true },
    }),
  ])

  const total = current._sum.amount || 0
  const lastMonthTotal = previous._sum.amount || 0
  const monthOverMonthChange = lastMonthTotal > 0 ? ((total - lastMonthTotal) / lastMonthTotal) * 100 : 0

  return { total, lastMonthTotal, monthOverMonthChange }
}

export async function getCashFlow(months = 6, endMonth = new Date()): Promise<CashFlowData[]> {
  const { organizationId } = await getAuthContext()

  const now = endMonth
  const startDate = startOfMonth(subMonths(now, months - 1))
  const endDate = endOfMonth(now)

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      date: { gte: startDate, lte: endDate },
      status: { not: "excluded" },
    },
    select: { amount: true, date: true, direction: true },
  })

  const monthlyData = new Map<string, { inflow: number; outflow: number }>()
  for (let i = 0; i < months; i++) {
    monthlyData.set(format(subMonths(now, months - 1 - i), "yyyy-MM"), { inflow: 0, outflow: 0 })
  }

  for (const entry of entries) {
    const monthKey = format(new Date(entry.date), "yyyy-MM")
    const data = monthlyData.get(monthKey)
    if (data) {
      if (entry.direction === "expense") data.outflow += entry.amount
      else data.inflow += entry.amount
    }
  }

  return Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: format(new Date(month + "-01"), "MMM"),
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow,
    }))
}

export interface IncomeStats {
  totalThisMonth: number
  currency: string
  byCategory: Array<{ categoryId: string | null; categoryName: string; total: number }>
}

export async function getIncomeStats(date = new Date()): Promise<IncomeStats> {
  const { organizationId } = await getAuthContext()
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const where = {
    organizationId,
    direction: "income" as const,
    date: { gte: monthStart, lte: monthEnd },
    status: { not: "excluded" as const },
  }

  const [account, totalAgg, grouped] = await Promise.all([
    prisma.account.findFirst({ where: { organizationId, status: "active" }, select: { currency: true } }),
    prisma.entry.aggregate({ where, _sum: { amount: true } }),
    prisma.entry.groupBy({ by: ["categoryId"], where, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
  ])

  const categoryIds = grouped.flatMap(g => g.categoryId ? [g.categoryId] : [])
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : []
  const catMap = new Map(categories.map(c => [c.id, c]))

  return {
    totalThisMonth: totalAgg._sum.amount ?? 0,
    currency: account?.currency ?? "EUR",
    byCategory: grouped.map(g => ({
      categoryId: g.categoryId,
      categoryName: g.categoryId ? (catMap.get(g.categoryId)?.name ?? "Uncategorized") : "Uncategorized",
      total: g._sum.amount ?? 0,
    })),
  }
}

export interface VATQuarter {
  quarter: 1 | 2 | 3 | 4
  start: Date
  end: Date
  collected: number
  paid: number
  net: number
}

export interface VATSummary {
  year: number
  currency: string
  quarters: VATQuarter[]
  currentQuarter: VATQuarter
  ytdCollected: number
  ytdPaid: number
  ytdNet: number
}

export async function getVATSummary(year = new Date().getFullYear()): Promise<VATSummary> {
  const { organizationId } = await getAuthContext()

  const fiscalQuarters = getFiscalQuarters(year)
  const yearStart = fiscalQuarters[0].start
  const yearEnd = fiscalQuarters[3].end

  const [entries, account] = await Promise.all([
    prisma.entry.findMany({
      where: {
        organizationId,
        taxAmount: { not: null },
        status: { not: "excluded" },
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { taxAmount: true, date: true, direction: true },
    }),
    prisma.account.findFirst({ where: { organizationId, status: "active" }, select: { currency: true } }),
  ])

  const totals = new Map<number, { collected: number; paid: number }>()
  for (const fq of fiscalQuarters) {
    totals.set(fq.quarter, { collected: 0, paid: 0 })
  }

  for (const entry of entries) {
    const q = getQuarter(new Date(entry.date)) as 1 | 2 | 3 | 4
    const row = totals.get(q)
    if (!row || entry.taxAmount == null) continue
    const tax = Number(entry.taxAmount)
    if (entry.direction === "income") row.collected += tax
    else row.paid += tax
  }

  const quarters: VATQuarter[] = fiscalQuarters.map((fq) => {
    const row = totals.get(fq.quarter) ?? { collected: 0, paid: 0 }
    return { ...fq, collected: row.collected, paid: row.paid, net: row.collected - row.paid }
  })

  const currentQNum = getCurrentQuarterNumber()
  const currentQuarter = quarters.find(q => q.quarter === currentQNum) ?? quarters[0]

  return {
    year,
    currency: account?.currency ?? "EUR",
    quarters,
    currentQuarter,
    ytdCollected: quarters.reduce((s, q) => s + q.collected, 0),
    ytdPaid: quarters.reduce((s, q) => s + q.paid, 0),
    ytdNet: quarters.reduce((s, q) => s + q.net, 0),
  }
}
