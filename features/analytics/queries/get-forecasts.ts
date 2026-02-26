import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns"

// ============================================================================
// Cash Flow Forecast
// ============================================================================

export interface CashFlowForecastMonth {
  month: string // "2026-02"
  monthLabel: string // "Feb"
  projectedIncome: number
  projectedExpenses: number
  projectedNet: number
  projectedBalance: number
  confidence: number // 0-1
  isHistorical: boolean
}

export interface CashFlowForecast {
  currentBalance: number
  currency: string
  months: CashFlowForecastMonth[]
  assumptions: {
    recurringIncomeCount: number
    recurringExpenseCount: number
    avgMonthlyIncome: number
    avgMonthlyExpenses: number
    trendBasis: string
  }
}

export async function getCashFlowForecast(forecastMonths = 3): Promise<CashFlowForecast> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const historicalMonths = 3

  // Get current balance
  const accounts = await prisma.account.findMany({
    where: { organizationId, status: "active" },
    select: { balanceCurrent: true, currency: true },
  })

  const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balanceCurrent || 0), 0)
  const currency = accounts[0]?.currency || "USD"

  // Get historical data for the last 3 months
  const startDate = startOfMonth(subMonths(now, historicalMonths))
  const endDate = endOfMonth(now)

  const [expenses, incomes, recurringPatterns] = await Promise.all([
    prisma.expense.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
        status: { not: "excluded" },
      },
      select: { amount: true, date: true, expenseType: true },
    }),
    prisma.income.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
        status: { not: "excluded" },
      },
      select: { amount: true, date: true },
    }),
    prisma.recurringPattern.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        expectedAmount: true,
        frequency: true,
        confidenceScore: true,
      },
    }),
  ])

  // Calculate monthly totals by type (fixed vs variable) and income
  const monthlyFixed = new Map<string, number>()
  const monthlyVariable = new Map<string, number>()
  const monthlyIncomes = new Map<string, number>()

  for (const expense of expenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")
    if (expense.expenseType === "fixed") {
      monthlyFixed.set(monthKey, (monthlyFixed.get(monthKey) || 0) + expense.amount)
    } else {
      monthlyVariable.set(monthKey, (monthlyVariable.get(monthKey) || 0) + expense.amount)
    }
  }

  for (const income of incomes) {
    const monthKey = format(new Date(income.date), "yyyy-MM")
    monthlyIncomes.set(monthKey, (monthlyIncomes.get(monthKey) || 0) + income.amount)
  }

  // Calculate averages (same logic as getExpenseForecast)
  const fixedValues = Array.from(monthlyFixed.values())
  const variableValues = Array.from(monthlyVariable.values())
  const incomeValues = Array.from(monthlyIncomes.values())

  const avgFixed = fixedValues.length > 0
    ? fixedValues.reduce((a, b) => a + b, 0) / fixedValues.length
    : 0

  const avgVariable = variableValues.length > 0
    ? variableValues.reduce((a, b) => a + b, 0) / variableValues.length
    : 0

  const avgMonthlyIncome = incomeValues.length > 0
    ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length
    : 0

  // Use recurring patterns for fixed expense floor
  const recurringFixed = recurringPatterns
    .filter(p => p.frequency === "monthly")
    .reduce((sum, p) => sum + ((p.expectedAmount ?? 0) * (p.confidenceScore ?? 0.5)), 0)

  const projectedFixed = Math.max(avgFixed, recurringFixed)
  const avgMonthlyExpenses = projectedFixed + avgVariable

  // Build forecast months
  const months: CashFlowForecastMonth[] = []
  let runningBalance = currentBalance

  // Add historical months first
  for (let i = historicalMonths - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, "yyyy-MM")
    const monthIncome = monthlyIncomes.get(monthKey) || 0
    const monthExpenses = (monthlyFixed.get(monthKey) || 0) + (monthlyVariable.get(monthKey) || 0)
    const monthNet = monthIncome - monthExpenses

    months.push({
      month: monthKey,
      monthLabel: format(monthDate, "MMM"),
      projectedIncome: monthIncome,
      projectedExpenses: monthExpenses,
      projectedNet: monthNet,
      projectedBalance: 0, // Will be calculated
      confidence: 1, // Historical data = 100% confidence
      isHistorical: true,
    })
  }

  // Add forecast months
  for (let i = 1; i <= forecastMonths; i++) {
    const monthDate = addMonths(now, i)
    const monthKey = format(monthDate, "yyyy-MM")

    // Use same projection as expense forecast: max(avgFixed, recurringFixed) + avgVariable
    const projectedExpenses = avgMonthlyExpenses
    const projectedIncome = avgMonthlyIncome

    const projectedNet = projectedIncome - projectedExpenses
    runningBalance += projectedNet

    // Confidence decreases with distance
    const baseConfidence = recurringPatterns.length > 0 ? 0.8 : 0.5
    const confidence = Math.max(0.3, baseConfidence - (i * 0.1))

    months.push({
      month: monthKey,
      monthLabel: format(monthDate, "MMM"),
      projectedIncome,
      projectedExpenses,
      projectedNet,
      projectedBalance: runningBalance,
      confidence,
      isHistorical: false,
    })
  }

  // Recalculate running balance for historical months (backwards from current)
  let historyBalance = currentBalance
  for (let i = months.length - forecastMonths - 1; i >= 0; i--) {
    if (months[i].isHistorical) {
      historyBalance -= months[i].projectedNet
      months[i].projectedBalance = historyBalance
    }
  }

  return {
    currentBalance,
    currency,
    months,
    assumptions: {
      recurringIncomeCount: 0,
      recurringExpenseCount: recurringPatterns.filter(p => p.frequency === "monthly").length,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      trendBasis: `${historicalMonths}-month average`,
    },
  }
}

// ============================================================================
// Revenue Forecast
// ============================================================================

export interface ClientRevenueForecast {
  clientId: string
  clientName: string
  projectedRevenue: number
  lastMonthRevenue: number
  trend: "growing" | "stable" | "declining"
  confidence: number
}

export interface RevenueForecast {
  nextMonth: {
    projected: number
    breakdown: {
      recurring: number
      trending: number
      oneTime: number
    }
    confidence: number
  }
  quarterProjection: number
  yearProjection: number
  monthOverMonthChange: number
  topClients: ClientRevenueForecast[]
}

export async function getRevenueForecast(): Promise<RevenueForecast> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const threeMonthsAgo = startOfMonth(subMonths(now, 3))

  // Get income data with client info
  const incomes = await prisma.income.findMany({
    where: {
      organizationId,
      date: { gte: threeMonthsAgo },
      status: { not: "excluded" },
    },
    select: {
      amount: true,
      date: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
  })

  // Calculate monthly totals and per-client monthly totals
  const monthlyTotals = new Map<string, number>()
  const clientMonthlyTotals = new Map<string, Map<string, number>>()
  const clientsMap = new Map<string, { name: string }>()

  for (const income of incomes) {
    const monthKey = format(new Date(income.date), "yyyy-MM")
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + income.amount)

    if (income.clientId && income.client) {
      clientsMap.set(income.client.id, { name: income.client.name })
      if (!clientMonthlyTotals.has(income.clientId)) {
        clientMonthlyTotals.set(income.clientId, new Map())
      }
      const clientMap = clientMonthlyTotals.get(income.clientId)!
      clientMap.set(monthKey, (clientMap.get(monthKey) || 0) + income.amount)
    }
  }

  // Determine recurring vs one-time from actual client data
  // A client is "recurring" if they appear in 2+ of the last 3 months
  const recentMonthKeys = [1, 2, 3].map(i => format(subMonths(now, i), "yyyy-MM"))
  let recurringRevenue = 0
  let oneTimeRevenue = 0

  for (const [, monthlyData] of clientMonthlyTotals) {
    const monthsPresent = recentMonthKeys.filter(mk => monthlyData.has(mk)).length
    const clientValues = Array.from(monthlyData.values())
    const clientAvg = clientValues.reduce((a, b) => a + b, 0) / clientValues.length

    if (monthsPresent >= 2) {
      recurringRevenue += clientAvg
    } else {
      oneTimeRevenue += clientAvg
    }
  }

  // Income without a client — count as one-time
  const totalAvgWithClients = recurringRevenue + oneTimeRevenue
  const monthlyValues = Array.from(monthlyTotals.values())
  const avgMonthlyRevenue = monthlyValues.length > 0
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
    : 0
  const unattributedRevenue = Math.max(0, avgMonthlyRevenue - totalAvgWithClients)
  oneTimeRevenue += unattributedRevenue

  const nextMonthProjected = recurringRevenue + oneTimeRevenue

  // Month-over-month: compare last two full months
  const lastMonthKey = format(subMonths(now, 1), "yyyy-MM")
  const twoMonthsAgoKey = format(subMonths(now, 2), "yyyy-MM")
  const lastMonthRevenue = monthlyTotals.get(lastMonthKey) || 0
  const twoMonthsAgoRevenue = monthlyTotals.get(twoMonthsAgoKey) || 0

  const monthOverMonthChange = twoMonthsAgoRevenue > 0
    ? ((lastMonthRevenue - twoMonthsAgoRevenue) / twoMonthsAgoRevenue) * 100
    : 0

  // Build client-level forecasts
  const clientForecasts: ClientRevenueForecast[] = []

  for (const [clientId, monthlyData] of clientMonthlyTotals) {
    const client = clientsMap.get(clientId)
    if (!client) continue

    const clientLastMonth = monthlyData.get(lastMonthKey) || 0
    const clientTwoMonthsAgo = monthlyData.get(twoMonthsAgoKey) || 0
    const clientValues = Array.from(monthlyData.values())
    const clientAvg = clientValues.reduce((a, b) => a + b, 0) / clientValues.length

    let trend: "growing" | "stable" | "declining" = "stable"
    if (clientTwoMonthsAgo > 0) {
      if (clientLastMonth > clientTwoMonthsAgo * 1.1) trend = "growing"
      else if (clientLastMonth < clientTwoMonthsAgo * 0.9) trend = "declining"
    }

    clientForecasts.push({
      clientId,
      clientName: client.name,
      projectedRevenue: clientAvg,
      lastMonthRevenue: clientLastMonth,
      trend,
      confidence: Math.min(0.9, clientValues.length * 0.25),
    })
  }

  clientForecasts.sort((a, b) => b.projectedRevenue - a.projectedRevenue)

  // Confidence based on data quality
  const hasMultipleMonths = monthlyValues.length >= 2
  const hasRecurringClients = recurringRevenue > 0
  const confidence = hasRecurringClients ? 0.8 : (hasMultipleMonths ? 0.6 : 0.4)

  return {
    nextMonth: {
      projected: nextMonthProjected,
      breakdown: {
        recurring: recurringRevenue,
        trending: 0,
        oneTime: oneTimeRevenue,
      },
      confidence,
    },
    quarterProjection: nextMonthProjected * 3,
    yearProjection: nextMonthProjected * 12,
    monthOverMonthChange,
    topClients: clientForecasts.slice(0, 5),
  }
}

// ============================================================================
// Expense Forecast
// ============================================================================

export interface CategoryExpenseForecast {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  projected: number
  lastMonth: number
  trend: number // % change
  confidence: number
}

export interface ExpenseForecastAlert {
  type: "spike" | "new_recurring" | "unusual"
  message: string
  categoryId?: string
}

export interface ExpenseForecast {
  nextMonth: {
    projected: number
    byType: {
      fixed: number
      variable: number
    }
    confidence: number
  }
  byCategory: CategoryExpenseForecast[]
  alerts: ExpenseForecastAlert[]
  monthOverMonthChange: number
}

export async function getExpenseForecast(): Promise<ExpenseForecast> {
  const { organizationId } = await getAuthContext()

  const now = new Date()
  const threeMonthsAgo = startOfMonth(subMonths(now, 3))
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Get expense data with categories
  const [expenses, recurringPatterns] = await Promise.all([
    prisma.expense.findMany({
      where: {
        organizationId,
        date: { gte: threeMonthsAgo },
        status: { not: "excluded" },
      },
      select: {
        amount: true,
        date: true,
        expenseType: true,
        categoryId: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.recurringPattern.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        expectedAmount: true,
        frequency: true,
        confidenceScore: true,
      },
    }),
  ])

  // Calculate monthly totals by type and category
  const monthlyFixed = new Map<string, number>()
  const monthlyVariable = new Map<string, number>()
  const categoryMonthly = new Map<string | null, Map<string, { amount: number; name: string; color: string }>>()

  for (const expense of expenses) {
    const monthKey = format(new Date(expense.date), "yyyy-MM")

    if (expense.expenseType === "fixed") {
      monthlyFixed.set(monthKey, (monthlyFixed.get(monthKey) || 0) + expense.amount)
    } else {
      monthlyVariable.set(monthKey, (monthlyVariable.get(monthKey) || 0) + expense.amount)
    }

    // Category tracking
    const catKey = expense.categoryId
    if (!categoryMonthly.has(catKey)) {
      categoryMonthly.set(catKey, new Map())
    }
    const catMap = categoryMonthly.get(catKey)!
    const existing = catMap.get(monthKey) || {
      amount: 0,
      name: expense.category?.name || "Uncategorized",
      color: expense.category?.color || "#6b7280",
    }
    existing.amount += expense.amount
    catMap.set(monthKey, existing)
  }

  // Calculate averages
  const fixedValues = Array.from(monthlyFixed.values())
  const variableValues = Array.from(monthlyVariable.values())

  const avgFixed = fixedValues.length > 0
    ? fixedValues.reduce((a, b) => a + b, 0) / fixedValues.length
    : 0

  const avgVariable = variableValues.length > 0
    ? variableValues.reduce((a, b) => a + b, 0) / variableValues.length
    : 0

  // Add recurring pattern amounts to fixed projection
  const recurringFixed = recurringPatterns
    .filter(p => p.frequency === "monthly")
    .reduce((sum, p) => sum + ((p.expectedAmount ?? 0) * (p.confidenceScore ?? 0.5)), 0)

  const projectedFixed = Math.max(avgFixed, recurringFixed)

  // Calculate month-over-month change
  const lastMonthKey = format(subMonths(now, 1), "yyyy-MM")
  const twoMonthsAgoKey = format(subMonths(now, 2), "yyyy-MM")

  const lastMonthTotal = (monthlyFixed.get(lastMonthKey) || 0) + (monthlyVariable.get(lastMonthKey) || 0)
  const twoMonthsAgoTotal = (monthlyFixed.get(twoMonthsAgoKey) || 0) + (monthlyVariable.get(twoMonthsAgoKey) || 0)

  const monthOverMonthChange = twoMonthsAgoTotal > 0
    ? ((lastMonthTotal - twoMonthsAgoTotal) / twoMonthsAgoTotal) * 100
    : 0

  // Build category forecasts
  const categoryForecasts: CategoryExpenseForecast[] = []
  const alerts: ExpenseForecastAlert[] = []

  for (const [catId, monthlyData] of categoryMonthly) {
    const values = Array.from(monthlyData.values())
    const firstEntry = values[0] || { name: "Uncategorized", color: "#6b7280", amount: 0 }

    const amounts = values.map(v => v.amount)
    const avgAmount = amounts.length > 0
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length
      : 0

    const lastMonthData = monthlyData.get(lastMonthKey)
    const twoMonthsAgoData = monthlyData.get(twoMonthsAgoKey)

    const lastMonthAmount = lastMonthData?.amount || 0
    const twoMonthsAgoAmount = twoMonthsAgoData?.amount || 0

    const trend = twoMonthsAgoAmount > 0
      ? ((lastMonthAmount - twoMonthsAgoAmount) / twoMonthsAgoAmount) * 100
      : 0

    categoryForecasts.push({
      categoryId: catId,
      categoryName: firstEntry.name,
      categoryColor: firstEntry.color,
      projected: avgAmount,
      lastMonth: lastMonthAmount,
      trend,
      confidence: Math.min(0.9, amounts.length * 0.3),
    })

    // Check for alerts
    if (trend > 50) {
      alerts.push({
        type: "spike",
        message: `${firstEntry.name} expenses increased ${Math.round(trend)}% this month`,
        categoryId: catId || undefined,
      })
    }
  }

  // Sort by projected amount
  categoryForecasts.sort((a, b) => b.projected - a.projected)

  // Calculate confidence
  const hasRecurring = recurringPatterns.length > 0
  const hasHistory = fixedValues.length >= 2
  const confidence = hasRecurring ? 0.8 : (hasHistory ? 0.6 : 0.4)

  return {
    nextMonth: {
      projected: projectedFixed + avgVariable,
      byType: {
        fixed: projectedFixed,
        variable: avgVariable,
      },
      confidence,
    },
    byCategory: categoryForecasts.slice(0, 8),
    alerts,
    monthOverMonthChange,
  }
}
