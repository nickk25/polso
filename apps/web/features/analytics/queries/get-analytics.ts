import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

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

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction,
      date: { gte: monthStart, lte: monthEnd },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      category: { select: { id: true, name: true, color: true } },
    },
  })

  const categoryTotals = new Map<string | null, { name: string; color: string; total: number; count: number }>()
  for (const entry of entries) {
    const key = entry.category?.id || null
    const current = categoryTotals.get(key) || {
      name: entry.category?.name || "Uncategorized",
      color: entry.category?.color || "#6b7280",
      total: 0,
      count: 0,
    }
    current.total += entry.amount
    current.count++
    categoryTotals.set(key, current)
  }

  const grandTotal = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.total, 0)
  return Array.from(categoryTotals.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      categoryColor: data.color,
      total: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      count: data.count,
    }))
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

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      date: { gte: monthStart, lte: monthEnd },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      counterparty: { select: { id: true, name: true } },
      transaction: { select: { merchantName: true } },
    },
  })

  const totals = new Map<string | null, { name: string; total: number; count: number }>()
  for (const entry of entries) {
    const key = entry.counterparty?.id || null
    const name = entry.counterparty?.name || entry.transaction?.merchantName || "Unknown"
    const current = totals.get(key) || { name, total: 0, count: 0 }
    current.total += entry.amount
    current.count++
    totals.set(key, current)
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, v) => sum + v.total, 0)
  return Array.from(totals.entries())
    .map(([id, data]) => ({
      counterpartyId: id,
      counterpartyName: data.name,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
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

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "income",
      date: { gte: monthStart, lte: monthEnd },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      category: { select: { id: true, name: true } },
    },
  })

  const totalThisMonth = entries.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = new Map<string | null, { name: string; total: number }>()
  for (const e of entries) {
    const key = e.category?.id ?? null
    const current = byCategory.get(key) ?? { name: e.category?.name ?? "Uncategorized", total: 0 }
    current.total += e.amount
    byCategory.set(key, current)
  }

  return {
    totalThisMonth,
    currency: "EUR",
    byCategory: Array.from(byCategory.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      total: data.total,
    })).sort((a, b) => b.total - a.total),
  }
}
