import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export async function getOrganizationSettings() {
  const { organizationId } = await getAuthContext()

  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      fiscalYearStart: true,
      dateFormat: true,
    },
  })
}
