import { prisma, transactionNotDocumentedWhere } from "@polso/db"
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns"
import type { ProactiveContext } from "@polso/agent/proactive"

// ─── Receipt reminder ────────────────────────────────────────────────────────

export async function getUnmatchedTransactions(
  organizationId: string
): Promise<NonNullable<ProactiveContext["unmatchedTransactions"]>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId,
      date: { gte: since },
      ...transactionNotDocumentedWhere,
    },
    select: {
      name: true,
      merchantName: true,
      amount: true,
      currency: true,
      date: true,
    },
    orderBy: [{ amount: "desc" }],
    take: 10,
  })

  return transactions.map((t) => ({
    name: t.merchantName ?? t.name ?? "Sin nombre",
    amount: Math.abs(t.amount),
    currency: t.currency,
    date: t.date.toISOString().split("T")[0]!,
  }))
}

// ─── Weekly summary ───────────────────────────────────────────────────────────

export async function getWeeklySummary(
  organizationId: string
): Promise<NonNullable<ProactiveContext["summary"]>> {
  const now = new Date()
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevPrevWeekStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 })
  const prevPrevWeekEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 })

  const currency = await getOrgCurrency(organizationId)
  const [income, expenses, prevIncome, prevExpenses, conciliated, total, prevConciliated, prevTotal] =
    await Promise.all([
      aggregateAmount(organizationId, prevWeekStart, prevWeekEnd, "income"),
      aggregateAmount(organizationId, prevWeekStart, prevWeekEnd, "expense"),
      aggregateAmount(organizationId, prevPrevWeekStart, prevPrevWeekEnd, "income"),
      aggregateAmount(organizationId, prevPrevWeekStart, prevPrevWeekEnd, "expense"),
      countConciliated(organizationId, prevWeekStart, prevWeekEnd),
      countTransactions(organizationId, prevWeekStart, prevWeekEnd),
      countConciliated(organizationId, prevPrevWeekStart, prevPrevWeekEnd),
      countTransactions(organizationId, prevPrevWeekStart, prevPrevWeekEnd),
    ])

  const topCategories = await getTopCategories(organizationId, prevWeekStart, prevWeekEnd)
  const conciliationPct = total > 0 ? Math.round((conciliated / total) * 100) : 0
  const prevConciliationPct = prevTotal > 0 ? Math.round((prevConciliated / prevTotal) * 100) : undefined

  const periodLabel = `semana del ${prevWeekStart.toLocaleDateString("es-ES", { day: "numeric", month: "long" })} al ${prevWeekEnd.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`

  return {
    period: periodLabel,
    totalIncome: income,
    totalExpenses: expenses,
    currency,
    topCategories,
    receiptsConciliated: conciliated,
    totalTransactions: total,
    conciliationPct,
    previousPeriodConciliationPct: prevConciliationPct,
  }
}

// ─── Monthly summary ──────────────────────────────────────────────────────────

export async function getMonthlySummary(
  organizationId: string
): Promise<NonNullable<ProactiveContext["summary"]>> {
  const now = new Date()
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
  const prevPrevMonthStart = startOfMonth(subMonths(now, 2))
  const prevPrevMonthEnd = endOfMonth(subMonths(now, 2))

  const currency = await getOrgCurrency(organizationId)
  const [income, expenses, conciliated, total] = await Promise.all([
    aggregateAmount(organizationId, prevMonthStart, prevMonthEnd, "income"),
    aggregateAmount(organizationId, prevMonthStart, prevMonthEnd, "expense"),
    countConciliated(organizationId, prevMonthStart, prevMonthEnd),
    countTransactions(organizationId, prevMonthStart, prevMonthEnd),
  ])

  const [topCategories, prevCategories] = await Promise.all([
    getTopCategories(organizationId, prevMonthStart, prevMonthEnd),
    getTopCategories(organizationId, prevPrevMonthStart, prevPrevMonthEnd),
  ])

  const conciliationPct = total > 0 ? Math.round((conciliated / total) * 100) : 0

  const prevCategoryMap = new Map(prevCategories.map((c) => [c.name, c.amount]))
  const categoryChanges = topCategories
    .map((c) => {
      const prev = prevCategoryMap.get(c.name) ?? 0
      const changePct = prev > 0 ? ((c.amount - prev) / prev) * 100 : 0
      return { name: c.name, currentAmount: c.amount, previousAmount: prev, changePct }
    })
    .filter((c) => c.changePct > 30)

  const periodLabel = prevMonthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" })

  return {
    period: periodLabel,
    totalIncome: income,
    totalExpenses: expenses,
    currency,
    topCategories,
    receiptsConciliated: conciliated,
    totalTransactions: total,
    conciliationPct,
    categoryChanges,
  }
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

export async function getAnomalies(organizationId: string): Promise<{
  anomalies: NonNullable<ProactiveContext["anomalies"]>
  missingRecurring: NonNullable<ProactiveContext["missingRecurring"]>
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Recent expenses with category info
  const recentExpenses = await prisma.expense.findMany({
    where: {
      organizationId,
      createdAt: { gte: since },
      status: { not: "excluded" },
      categoryId: { not: null },
    },
    select: {
      id: true,
      amount: true,
      description: true,
      categoryId: true,
      category: { select: { name: true } },
      transaction: { select: { currency: true } },
    },
  })

  const anomalies: NonNullable<ProactiveContext["anomalies"]> = []

  for (const expense of recentExpenses) {
    if (!expense.categoryId) continue

    const avg = await prisma.expense.aggregate({
      where: {
        organizationId,
        categoryId: expense.categoryId,
        status: { not: "excluded" },
        date: { gte: ninetyDaysAgo },
        id: { not: expense.id },
      },
      _avg: { amount: true },
      _count: true,
    })

    if (!avg._avg.amount || avg._count < 3) continue
    if (expense.amount < avg._avg.amount * 2) continue

    anomalies.push({
      description: expense.description ?? expense.category?.name ?? "Gasto",
      amount: expense.amount,
      currency: expense.transaction?.currency ?? "EUR",
      categoryName: expense.category?.name ?? "Sin categoría",
      categoryAvg: avg._avg.amount,
    })

    if (anomalies.length >= 3) break
  }

  // Missing recurring charges
  const now = new Date()
  const currentDay = now.getDate()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const recurringPatterns = await prisma.recurringPattern.findMany({
    where: {
      organizationId,
      isActive: true,
      frequency: "monthly",
      expectedDayOfMonth: { lte: currentDay },
    },
    select: {
      id: true,
      name: true,
      expectedAmount: true,
    },
  })

  const missingRecurring: NonNullable<ProactiveContext["missingRecurring"]> = []

  for (const pattern of recurringPatterns) {
    if (!pattern.expectedAmount) continue

    // Check if there's an expense linked to this specific recurring pattern this month
    const found = await prisma.expense.count({
      where: {
        organizationId,
        recurringPatternId: pattern.id,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    if (found === 0) {
      missingRecurring.push({
        name: pattern.name,
        expectedAmount: pattern.expectedAmount,
        currency: "EUR",
      })
    }

    if (missingRecurring.length >= 3) break
  }

  return { anomalies, missingRecurring }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgCurrency(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true },
  })
  return org?.currency ?? "EUR"
}

async function aggregateAmount(
  organizationId: string,
  from: Date,
  to: Date,
  type: "income" | "expense"
): Promise<number> {
  if (type === "income") {
    const result = await prisma.transaction.aggregate({
      where: { organizationId, date: { gte: from, lte: to }, amount: { lt: 0 } },
      _sum: { amount: true },
    })
    return Math.abs(result._sum.amount ?? 0)
  } else {
    const result = await prisma.transaction.aggregate({
      where: { organizationId, date: { gte: from, lte: to }, amount: { gt: 0 } },
      _sum: { amount: true },
    })
    return result._sum.amount ?? 0
  }
}

async function countConciliated(organizationId: string, from: Date, to: Date): Promise<number> {
  return prisma.transaction.count({
    where: {
      organizationId,
      date: { gte: from, lte: to },
      OR: [
        { transactionAttachments: { some: {} } },
        { inboxItems: { some: { transactionId: { not: null } } } },
        { expense: { status: "documented" } },
      ],
    },
  })
}

async function countTransactions(organizationId: string, from: Date, to: Date): Promise<number> {
  return prisma.transaction.count({
    where: { organizationId, date: { gte: from, lte: to } },
  })
}

async function getTopCategories(
  organizationId: string,
  from: Date,
  to: Date
): Promise<Array<{ name: string; amount: number }>> {
  const expenses = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: {
      organizationId,
      date: { gte: from, lte: to },
      status: { not: "excluded" },
      categoryId: { not: null },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  })

  const categoryIds = expenses.map((e) => e.categoryId!).filter(Boolean)
  if (categoryIds.length === 0) return []

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  })

  const nameMap = new Map(categories.map((c) => [c.id, c.name]))

  return expenses
    .map((e) => ({
      name: nameMap.get(e.categoryId!) ?? "Sin categoría",
      amount: e._sum.amount ?? 0,
    }))
    .filter((e) => e.amount > 0)
}
