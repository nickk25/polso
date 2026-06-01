import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { getFiscalQuarters, getCurrentQuarterNumber } from "@polso/utils/quarters"
import type { FiscalQuarter } from "@polso/utils/quarters"

export interface VATQuarter extends FiscalQuarter {
  paid: number
  collected: number
  net: number
}

export interface ClientVATSummary {
  year: number
  currency: string
  quarters: VATQuarter[]
  currentQuarter: VATQuarter
  ytdPaid: number
  ytdCollected: number
  ytdNet: number
}

export async function getClientVATSummary(
  partnerId: string,
  clientId: string,
  year = new Date().getFullYear()
): Promise<ClientVATSummary> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })
  if (!link) notFound()

  const fiscalQuarters = getFiscalQuarters(year)
  const yearStart = fiscalQuarters[0].start
  const yearEnd = fiscalQuarters[3].end

  const [entries, account] = await Promise.all([
    prisma.entry.findMany({
      where: {
        organizationId: clientId,
        taxAmount: { not: null },
        status: { not: "excluded" },
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { taxAmount: true, date: true, direction: true },
    }),
    prisma.account.findFirst({
      where: { organizationId: clientId, status: "active" },
      select: { currency: true },
    }),
  ])

  const totals = new Map<number, { collected: number; paid: number }>()
  for (const fq of fiscalQuarters) {
    totals.set(fq.quarter, { collected: 0, paid: 0 })
  }

  for (const entry of entries) {
    const month = new Date(entry.date).getMonth()
    const q = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4
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
  const currentQuarter = quarters.find((q) => q.quarter === currentQNum) ?? quarters[0]!

  return {
    year,
    currency: account?.currency ?? "EUR",
    quarters,
    currentQuarter,
    ytdPaid: quarters.reduce((s, q) => s + q.paid, 0),
    ytdCollected: quarters.reduce((s, q) => s + q.collected, 0),
    ytdNet: quarters.reduce((s, q) => s + q.net, 0),
  }
}
