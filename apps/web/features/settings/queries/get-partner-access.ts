import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface PartnerAccess {
  id: string
  partnerId: string
  partnerName: string
  partnerContactEmail: string | null
  status: string
  invitedAt: Date
  connectedAt: Date | null
}

export async function getPartnerAccess(): Promise<PartnerAccess[]> {
  const { organizationId } = await getAuthContext()

  const links = await prisma.partnerClient.findMany({
    where: { clientId: organizationId },
    select: {
      id: true,
      partnerId: true,
      status: true,
      invitedAt: true,
      connectedAt: true,
      partner: {
        select: {
          name: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })

  return links.map((link) => ({
    id: link.id,
    partnerId: link.partnerId,
    partnerName: link.partner.name,
    partnerContactEmail: link.partner.contactEmail,
    status: link.status,
    invitedAt: link.invitedAt,
    connectedAt: link.connectedAt,
  }))
}
