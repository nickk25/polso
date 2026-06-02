import { prisma, transactionDocumentedWhere, transactionNotDocumentedWhere } from "@polso/db"
import { getCurrentQuarter, getDaysToQuarterEnd } from "@polso/utils/quarters"

export interface ClientQuarterStatus {
  clientId: string
  clientName: string
  totalInQuarter: number
  documentedInQuarter: number
  coverageQuarterPct: number | null
  ivaPendingCount: number
  ivaPendingAmount: number
  receiptPendingCount: number
}

export interface PartnerQuarterRollup {
  quarter: 1 | 2 | 3 | 4
  daysToClose: number
  clients: ClientQuarterStatus[]
  totals: {
    ivaPendingClients: number
    receiptPendingClients: number
    fullyReadyClients: number
  }
}

export async function getPartnerQuarterRollup(
  partnerId: string,
): Promise<PartnerQuarterRollup | null> {
  const links = await prisma.partnerClient.findMany({
    where: { partnerId, status: "active" },
    select: { clientId: true, client: { select: { id: true, name: true } } },
  })

  if (links.length === 0) return null

  const clientIds = links.map((l) => l.clientId)
  const quarter = getCurrentQuarter()
  const daysToClose = getDaysToQuarterEnd()
  const dateRange = { gte: quarter.start, lte: quarter.end }

  const [totalByClient, documentedByClient, ivaPendingByClient, receiptPendingByClient] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: clientIds }, date: dateRange },
        _count: { id: true },
      }),
      prisma.transaction.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: clientIds }, date: dateRange, ...transactionDocumentedWhere },
        _count: { id: true },
      }),
      prisma.entry.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { in: clientIds },
          date: dateRange,
          status: { not: "excluded" },
          taxAmount: null,
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: clientIds }, date: dateRange, ...transactionNotDocumentedWhere },
        _count: { id: true },
      }),
    ])

  const totalMap = Object.fromEntries(totalByClient.map((r) => [r.organizationId, r._count.id]))
  const documentedMap = Object.fromEntries(
    documentedByClient.map((r) => [r.organizationId, r._count.id]),
  )
  const ivaMap = Object.fromEntries(
    ivaPendingByClient.map((r) => [
      r.organizationId,
      { count: r._count.id, amount: r._sum.amount ?? 0 },
    ]),
  )
  const receiptMap = Object.fromEntries(
    receiptPendingByClient.map((r) => [r.organizationId, r._count.id]),
  )

  const clients: ClientQuarterStatus[] = links.map((link) => {
    const total = totalMap[link.clientId] ?? 0
    const documented = documentedMap[link.clientId] ?? 0
    const iva = ivaMap[link.clientId] ?? { count: 0, amount: 0 }
    const receipt = receiptMap[link.clientId] ?? 0

    return {
      clientId: link.clientId,
      clientName: link.client.name,
      totalInQuarter: total,
      documentedInQuarter: documented,
      coverageQuarterPct: total > 0 ? Math.round((documented / total) * 100) : null,
      ivaPendingCount: iva.count,
      ivaPendingAmount: iva.amount,
      receiptPendingCount: receipt,
    }
  })

  clients.sort(
    (a, b) =>
      b.ivaPendingCount + b.receiptPendingCount - (a.ivaPendingCount + a.receiptPendingCount),
  )

  return {
    quarter: quarter.quarter,
    daysToClose,
    clients,
    totals: {
      ivaPendingClients: clients.filter((c) => c.ivaPendingCount > 0).length,
      receiptPendingClients: clients.filter((c) => c.receiptPendingCount > 0).length,
      fullyReadyClients: clients.filter(
        (c) => c.ivaPendingCount === 0 && c.receiptPendingCount === 0,
      ).length,
    },
  }
}
