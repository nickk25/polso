import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"

export interface AuthContext {
  userId: string
  organizationId: string
}

/**
 * Get the authenticated user's session and organization.
 * Throws an error if not authenticated or no organization found.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { user } = await neonAuth()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Get user's organization
  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })

  if (!userOrg) {
    throw new Error("Organization not found")
  }

  return {
    userId: user.id,
    organizationId: userOrg.organizationId,
  }
}

/**
 * Get the authenticated user's session and organization, or null if not authenticated.
 * Does not throw an error.
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  try {
    return await getAuthContext()
  } catch {
    return null
  }
}
