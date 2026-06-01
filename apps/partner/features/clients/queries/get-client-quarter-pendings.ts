import { prisma, transactionNotDocumentedWhere } from "@polso/db"
import { notFound } from "next/navigation"
import { getCurrentQuarter, getDaysToQuarterEnd } from "@polso/utils/quarters"

export interface ClientQuarterPendings {
  quarter: 1 | 2 | 3 | 4
  quarterStart: Date
  quarterEnd: Date
  daysToClose: number
  ivaPending: { count: number; amount: number }
  receiptPending: { count: number; amount: number }
  suggestionsPending: number
}

export async function getClientQuarterPendings(
  partnerId: string,
  clientId: string,
): Promise<ClientQuarterPendings> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  const quarter = getCurrentQuarter()
  const daysToClose = getDaysToQuarterEnd()

  const [ivaResult, receiptResult, suggestionCount] = await Promise.all([
    prisma.entry.aggregate({
      where: {
        organizationId: clientId,
        date: { gte: quarter.start, lte: quarter.end },
        status: { not: "excluded" },
        taxAmount: null,
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        organizationId: clientId,
        date: { gte: quarter.start, lte: quarter.end },
        ...transactionNotDocumentedWhere,
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.matchSuggestion.count({
      where: { organizationId: clientId, status: "pending" },
    }),
  ])

  return {
    quarter: quarter.quarter,
    quarterStart: quarter.start,
    quarterEnd: quarter.end,
    daysToClose,
    ivaPending: {
      count: ivaResult._count.id,
      amount: ivaResult._sum.amount ?? 0,
    },
    receiptPending: {
      count: receiptResult._count.id,
      amount: receiptResult._sum.amount ?? 0,
    },
    suggestionsPending: suggestionCount,
  }
}
