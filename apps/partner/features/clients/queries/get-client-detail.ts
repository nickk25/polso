import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface ClientDetail {
  id: string
  name: string
  type: string
  accounts: Array<{
    id: string
    name: string
    institutionName: string | null
    balanceCurrent: number | null
    currency: string
    status: string
    lastSyncedAt: Date | null
  }>
  unmatchedInbox: number
  totalExpenses30d: number
}

export async function getClientDetail(
  partnerId: string,
  clientId: string
): Promise<ClientDetail> {
  // Verify access
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })

  if (!link) notFound()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [client, expenseAgg, unmatchedInbox] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        type: true,
        accounts: {
          select: {
            id: true,
            name: true,
            institutionName: true,
            balanceCurrent: true,
            currency: true,
            status: true,
            lastSyncedAt: true,
          },
        },
      },
    }),
    prisma.expense.aggregate({
      where: {
        organizationId: clientId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),
    prisma.inboxItem.count({
      where: {
        organizationId: clientId,
        status: { in: ["new", "no_match"] },
      },
    }),
  ])

  if (!client) notFound()

  return {
    ...client,
    unmatchedInbox,
    totalExpenses30d: expenseAgg._sum.amount ?? 0,
  }
}
