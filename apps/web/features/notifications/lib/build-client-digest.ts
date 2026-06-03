import { prisma } from "@/lib/db"
import { subDays, startOfDay, endOfDay } from "date-fns"

export interface ClientDigestData {
  periodStart: Date
  periodEnd: Date
  totalSpendThisWeek: number
  totalSpendPriorWeek: number
  spendDeltaPct: number
  topCategories: { name: string; amount: number }[]
  accountBalances: { name: string; balance: number; currency: string }[]
  unmatchedReceiptsCount: number
  alertsTriggered: { type: string; title: string; severity: string }[]
  largeTransactions: { description: string; amount: number; date: Date }[]
  currency: string
}

export async function buildClientDigest(
  organizationId: string,
  now: Date
): Promise<ClientDigestData> {
  const periodEnd = endOfDay(subDays(now, 1))
  const periodStart = startOfDay(subDays(now, 7))
  const priorStart = startOfDay(subDays(now, 14))
  const priorEnd = endOfDay(subDays(now, 8))

  const [
    thisWeekAgg,
    priorWeekAgg,
    categorySpend,
    accounts,
    unmatchedCount,
    recentAlerts,
    topOutflows,
  ] = await Promise.all([
    prisma.entry.aggregate({
      where: {
        organizationId,
        direction: "expense",
        date: { gte: periodStart, lte: periodEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.entry.aggregate({
      where: {
        organizationId,
        direction: "expense",
        date: { gte: priorStart, lte: priorEnd },
        status: { not: "excluded" },
      },
      _sum: { amount: true },
    }),
    prisma.entry.groupBy({
      by: ["categoryId"],
      where: {
        organizationId,
        direction: "expense",
        date: { gte: periodStart, lte: periodEnd },
        status: { not: "excluded" },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    }),
    prisma.account.findMany({
      where: { organizationId, status: "active" },
      select: { name: true, balanceCurrent: true, currency: true },
    }),
    prisma.inboxItem.count({
      where: {
        organizationId,
        attachments: { none: {} },
      },
    }),
    prisma.alert.findMany({
      where: {
        organizationId,
        isDismissed: false,
        createdAt: { gte: periodStart },
      },
      select: { type: true, title: true, severity: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.entry.findMany({
      where: {
        organizationId,
        direction: "expense",
        date: { gte: periodStart, lte: periodEnd },
        status: { not: "excluded" },
      },
      select: { description: true, amount: true, date: true },
      orderBy: { amount: "desc" },
      take: 5,
    }),
  ])

  const categoryIds = categorySpend
    .map((c) => c.categoryId)
    .filter((id): id is string => id != null)

  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : []

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const topCategories = categorySpend
    .filter((c) => c.categoryId && c._sum.amount)
    .map((c) => ({
      name: categoryMap.get(c.categoryId!) ?? c.categoryId!,
      amount: c._sum.amount!,
    }))

  const thisWeek = thisWeekAgg._sum.amount ?? 0
  const priorWeek = priorWeekAgg._sum.amount ?? 0
  const spendDeltaPct = priorWeek > 0 ? ((thisWeek - priorWeek) / priorWeek) * 100 : 0

  const currency = accounts[0]?.currency ?? "EUR"

  return {
    periodStart,
    periodEnd,
    totalSpendThisWeek: thisWeek,
    totalSpendPriorWeek: priorWeek,
    spendDeltaPct,
    topCategories,
    accountBalances: accounts.map((a) => ({
      name: a.name,
      balance: a.balanceCurrent ?? 0,
      currency: a.currency,
    })),
    unmatchedReceiptsCount: unmatchedCount,
    alertsTriggered: recentAlerts,
    largeTransactions: topOutflows.map((e) => ({
      description: e.description ?? "",
      amount: e.amount,
      date: e.date,
    })),
    currency,
  }
}
