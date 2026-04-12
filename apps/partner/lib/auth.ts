import { cache } from "react"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"

export interface PartnerAuthContext {
  userId: string
  organizationId: string
  orgType: string
}

/**
 * Resolves the current user's org context.
 * Cached per-request via React.cache() — safe to call from multiple pages/components.
 *
 * The layout calls neonAuth() + getOrCreatePartnerOrg() before rendering children,
 * so by the time any page calls this, the UserOrganization record is guaranteed to exist.
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
