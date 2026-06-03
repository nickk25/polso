import { prisma } from "@/lib/db"

export interface PartnerClientSummary {
  id: string
  partnerId: string
  clientId: string
  status: string
  invitedAt: Date
  connectedAt: Date | null
  clientName: string
  unmatchedInbox: number
  lastSyncedAt: Date | null
  lastContactedAt: Date | null
}

export async function getClientList(
  partnerId: string
): Promise<PartnerClientSummary[]> {
  const links = await prisma.partnerClient.findMany({
    where: { partnerId },
    orderBy: { invitedAt: "desc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          accounts: {
            select: { lastSyncedAt: true },
            orderBy: { lastSyncedAt: "desc" },
            take: 1,
          },
          inboxItems: {
            where: { status: { in: ["new", "no_match"] } },
            select: { id: true },
          },
          proactiveMessages: {
            select: { sentAt: true },
            orderBy: { sentAt: "desc" },
            take: 1,
          },
        },
      },
    },
  })

  return links.map((link) => ({
    id: link.id,
    partnerId: link.partnerId,
    clientId: link.clientId,
    status: link.status,
    invitedAt: link.invitedAt,
    connectedAt: link.connectedAt,
    clientName: link.client.name,
    unmatchedInbox: link.client.inboxItems.length,
    lastSyncedAt: link.client.accounts[0]?.lastSyncedAt ?? null,
    lastContactedAt: link.client.proactiveMessages[0]?.sentAt ?? null,
  }))
}
