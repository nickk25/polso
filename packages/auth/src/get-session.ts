import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@polso/db"

export interface AuthContext {
  userId: string
  organizationId: string
}

export interface PartnerAuthContext extends AuthContext {
  orgType: string
}

/**
 * Get the authenticated user's session and organization.
 * Throws if not authenticated or no organization found.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { user } = await neonAuth()

  if (!user) {
    throw new Error("Unauthorized")
  }

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
 * Like getAuthContext but also returns the org type.
 * Used by apps/partner to verify this is a partner org.
 */
export async function getAuthContextWithType(): Promise<PartnerAuthContext> {
  const { user } = await neonAuth()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: {
      organizationId: true,
      organization: { select: { type: true } },
    },
  })

  if (!userOrg) {
    throw new Error("Organization not found")
  }

  return {
    userId: user.id,
    organizationId: userOrg.organizationId,
    orgType: userOrg.organization.type,
  }
}

/**
 * Get the authenticated user's name and email.
 * Use this when you need user profile info (e.g. greeting) without org context.
 */
export async function getUserProfile(): Promise<{ id: string; name: string | null; email: string | null }> {
  const { user } = await neonAuth()
  if (!user) throw new Error("Unauthorized")
  return { id: user.id, name: user.name ?? null, email: user.email ?? null }
}

/**
 * Get auth context without throwing. Returns null if not authenticated.
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  try {
    return await getAuthContext()
  } catch {
    return null
  }
}
