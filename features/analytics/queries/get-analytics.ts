import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export interface BurnRateData {
  burnRate: number
  runway: number
  totalBalance: number
  currency: string
}

export async function getBurnRateAndRunway(): Promise<BurnRateData> {
  const { organizationId } = await getAuthContext()

  // Get total balance from active accounts
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      status: "active",
    },
    select: {
      balanceCurrent: true,
      currency: true,
    },
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balanceCurrent || 0), 0)
  const currency = accounts[0]?.currency || "USD"

  // Calculate average monthly spend over the last 3 complete months
  const now = new Date()
  const threeMonthsAgo = startOfMonth(subMonths(now, 3))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const monthlyExpenses = await prisma.expense.groupBy({
    by: ["date"],
    where: {
      organizationId,
      date: {
        gte: threeMonthsAgo,
        lte: lastMonthEnd,
      },
      status: { not: "excluded" },
    },
    _sum: { amount: true },
  })

  // Group by month and calculate average
  const monthlyTotals = new Map<string, number>()

  for (const expense of monthlyExpenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")
    const current = monthlyTotals.get(monthKey) || 0
    monthlyTotals.set(monthKey, current + (expense._sum.amount || 0))
  }

  const monthCount = monthlyTotals.size || 1
  const totalSpent = Array.from(monthlyTotals.values()).reduce((sum, v) => sum + v, 0)
  const burnRate = totalSpent / monthCount

  // Calculate runway in months
  const runway = burnRate > 0 ? totalBalance / burnRate : 0

  return {
    burnRate,
    runway,
    totalBalance,
    currency,
  }
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

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      date: true,
      expenseType: true,
    },
  })

  // Group by month
  const monthlyData = new Map<string, { total: number; fixed: number; variable: number }>()

  // Initialize all months (ending at endMonth)
  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    const monthKey = format(monthDate, "yyyy-MM")
    monthlyData.set(monthKey, { total: 0, fixed: 0, variable: 0 })
  }

  // Aggregate expenses
  for (const expense of expenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")
    const data = monthlyData.get(monthKey)
    if (data) {
      data.total += expense.amount
      if (expense.expenseType === "fixed") {
        data.fixed += expense.amount
      } else {
        data.variable += expense.amount
      }
    }
  }

  // Convert to array sorted by month
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

export async function getCategoryBreakdown(date = new Date()): Promise<CategoryBreakdown[]> {
  const { organizationId } = await getAuthContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  })

  // Group by category
  const categoryTotals = new Map<
    string | null,
    { name: string; color: string; total: number; count: number }
  >()

  for (const expense of expenses) {
    const key = expense.category?.id || null
    const current = categoryTotals.get(key) || {
      name: expense.category?.name || "Uncategorized",
      color: expense.category?.color || "#6b7280",
      total: 0,
      count: 0,
    }
    current.total += expense.amount
    current.count += 1
    categoryTotals.set(key, current)
  }

  // Calculate percentages
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

export async function getIncomeCategoryBreakdown(date = new Date()): Promise<CategoryBreakdown[]> {
  const { organizationId } = await getAuthContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const incomes = await prisma.income.findMany({
    where: {
      organizationId,
      date: { gte: monthStart, lte: monthEnd },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  })

  const categoryTotals = new Map<
    string | null,
    { name: string; color: string; total: number; count: number }
  >()

  for (const income of incomes) {
    const key = income.category?.id || null
    const current = categoryTotals.get(key) || {
      name: income.category?.name || "Uncategorized",
      color: income.category?.color || "#6b7280",
      total: 0,
      count: 0,
    }
    current.total += income.amount
    current.count += 1
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

export interface TopVendor {
  vendorId: string | null
  vendorName: string
  total: number
  count: number
  percentage: number
}

export async function getTopVendors(limit = 10, date = new Date()): Promise<TopVendor[]> {
  const { organizationId } = await getAuthContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      transaction: {
        select: {
          merchantName: true,
          counterpartyName: true,
        },
      },
    },
  })

  // Group by vendor
  const vendorTotals = new Map<string | null, { name: string; total: number; count: number }>()

  for (const expense of expenses) {
    const key = expense.vendor?.id || expense.transaction?.counterpartyName || null
    const name =
      expense.vendor?.name ||
      expense.transaction?.merchantName ||
      expense.transaction?.counterpartyName ||
      "Unknown"
    const current = vendorTotals.get(key) || { name, total: 0, count: 0 }
    current.total += expense.amount
    current.count += 1
    vendorTotals.set(key, current)
  }

  // Calculate percentages and sort
  const grandTotal = Array.from(vendorTotals.values()).reduce((sum, v) => sum + v.total, 0)

  return Array.from(vendorTotals.entries())
    .map(([id, data]) => ({
      vendorId: id,
      vendorName: data.name,
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
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: monthStart, lte: monthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        date: { gte: prevMonthStart, lte: prevMonthEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
  ])

  const total = current._sum.amount || 0
  const lastMonthTotal = previous._sum.amount || 0
  const monthOverMonthChange =
    lastMonthTotal > 0 ? ((total - lastMonthTotal) / lastMonthTotal) * 100 : 0

  return { total, lastMonthTotal, monthOverMonthChange }
}

export async function getCashFlow(months = 6, endMonth = new Date()): Promise<CashFlowData[]> {
  const { organizationId } = await getAuthContext()

  const now = endMonth
  const startDate = startOfMonth(subMonths(now, months - 1))
  const endDate = endOfMonth(now)

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      pending: false,
    },
    select: {
      amount: true,
      date: true,
    },
  })

  // Group by month
  const monthlyData = new Map<string, { inflow: number; outflow: number }>()

  // Initialize all months (ending at endMonth)
  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(now, months - 1 - i)
    const monthKey = format(monthDate, "yyyy-MM")
    monthlyData.set(monthKey, { inflow: 0, outflow: 0 })
  }

  // Aggregate transactions (Plaid: positive = outflow, negative = inflow)
  for (const tx of transactions) {
    const monthKey = format(new Date(tx.date), "yyyy-MM")
    const data = monthlyData.get(monthKey)
    if (data) {
      if (tx.amount > 0) {
        data.outflow += tx.amount
      } else {
        data.inflow += Math.abs(tx.amount)
      }
    }
  }

  // Convert to array sorted by month
  return Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: format(new Date(month + "-01"), "MMM"),
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow,
    }))
}
