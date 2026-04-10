import { cache } from "react"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"

export interface PartnerAuthContext {
  userId: string
  organizationId: string
  orgType: string
}

/**
 * Cached per-request auth context.
 * The layout calls this first (creating the org if needed),
 * pages call it again — React cache() returns the same value within one request.
 */
export const getPartnerAuthContext = cache(async (): Promise<PartnerAuthContext> => {
  const { user } = await neonAuth()

  if (!user) throw new Error("Unauthorized")

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: {
      organizationId: true,
      organization: { select: { type: true } },
    },
  })

  if (!userOrg) throw new Error("Organization not found")

  return {
    userId: user.id,
    organizationId: userOrg.organizationId,
    orgType: userOrg.organization.type,
  }
})
