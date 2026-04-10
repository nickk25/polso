import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface InboxItemSummary {
  id: string
  fileName: string
  displayName: string | null
  amount: { toNumber: () => number } | null
  currency: string
  date: Date | null
  status: string
  source: string
  transactionId: string | null
  createdAt: Date
}

export async function getClientInbox(
  partnerId: string,
  clientId: string,
  page = 1,
  pageSize = 50
): Promise<{ items: InboxItemSummary[]; total: number }> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })

  if (!link) notFound()

  const where = { organizationId: clientId }

  const [items, total] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        displayName: true,
        amount: true,
        currency: true,
        date: true,
        status: true,
        source: true,
        transactionId: true,
        createdAt: true,
      },
    }),
    prisma.inboxItem.count({ where }),
  ])

  return { items, total }
}
