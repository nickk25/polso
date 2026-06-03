import { prisma } from "./client"

export interface PartnerRecipient {
  email: string
  name: string
}

export async function getPartnerNotificationEmail(
  partnerOrgId: string
): Promise<PartnerRecipient | null> {
  const org = await prisma.organization.findUnique({
    where: { id: partnerOrgId },
    select: { name: true, contactEmail: true },
  })
  if (!org?.contactEmail) return null
  return { email: org.contactEmail, name: org.name }
}
