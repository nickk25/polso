import { prisma } from "@/lib/db"

export interface PartnerClientSummary {
  kind: "client"
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

export interface PartnerInvitationSummary {
  kind: "invitation"
  id: string
  email: string
  clientName: string | null
  status: "pending" | "expired" | "revoked"
  emailStatus: string | null
  emailSentAt: Date | null
  invitedAt: Date
  expiresAt: Date
  token: string
}

export type PartnerClientRow = PartnerClientSummary | PartnerInvitationSummary

export async function getClientList(
  partnerId: string
): Promise<PartnerClientRow[]> {
  const now = new Date()

  const [links, invitations] = await Promise.all([
    prisma.partnerClient.findMany({
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
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: partnerId,
        role: "partner_client",
        status: { in: ["pending", "revoked"] },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const clientRows: PartnerClientSummary[] = links.map((link) => ({
    kind: "client",
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

  const invitationRows: PartnerInvitationSummary[] = invitations.map((inv) => ({
    kind: "invitation",
    id: inv.id,
    email: inv.email,
    clientName: inv.clientName ?? null,
    status: inv.status === "revoked" ? "revoked" : inv.expiresAt < now ? "expired" : "pending",
    emailStatus: inv.emailStatus ?? null,
    emailSentAt: inv.emailSentAt ?? null,
    invitedAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    token: inv.token,
  }))

  // Invitations first (most recent), then active clients
  return [...invitationRows, ...clientRows]
}
