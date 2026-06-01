import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { format, startOfMonth, subMonths, endOfMonth } from "date-fns"

export interface ClientPLPoint {
  month: string
  inflow: number
  outflow: number
  net: number
}

export async function getClientProfitLoss(
  partnerId: string,
  clientId: string,
  months = 6,
): Promise<ClientPLPoint[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  const now = new Date()
  const startDate = startOfMonth(subMonths(now, months - 1))
  const endDate = endOfMonth(now)

  const entries = await prisma.entry.findMany({
    where: {
      organizationId: clientId,
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
      month: format(new Date(month + "-01"), "MMM", { locale: undefined }),
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow,
    }))
}
