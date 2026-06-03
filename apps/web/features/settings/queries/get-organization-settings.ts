import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export async function getOrganizationSettings() {
  const { organizationId } = await getAuthContext()

  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      currency: true,
      fiscalYearStart: true,
      dateFormat: true,
    },
  })
}
