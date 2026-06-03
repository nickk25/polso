import { prisma } from "@/lib/db"
import { neonAuth } from "@neondatabase/auth/next/server"
import { getAuthContext } from "@polso/auth/get-session"

export interface TeamMember {
  id: string
  userId: string
  role: string
  createdAt: Date
  name: string | null
  email: string | null
  image: string | null
}

/**
 * Get all team members for the current organization.
 * Resolves name/email/image for the current user via neonAuth;
 * other members show null until a proper user directory is available.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { organizationId } = await getAuthContext()
  const { user: currentUser } = await neonAuth()

  const members = await prisma.userOrganization.findMany({
    where: { organizationId },
    select: {
      id: true,
      userId: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return members.map((m) => {
    if (m.userId === currentUser?.id) {
      return {
        ...m,
        name: currentUser.name ?? null,
        email: currentUser.email ?? null,
        image: currentUser.image ?? null,
      }
    }
    return { ...m, name: null, email: null, image: null }
  })
}

/**
 * Get team member count for the current organization
 */
export async function getTeamMemberCount(): Promise<number> {
  const { organizationId } = await getAuthContext()

  return prisma.userOrganization.count({
    where: { organizationId },
  })
}

/**
 * Check if a user has admin or owner role in the organization
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const { organizationId } = await getAuthContext()

  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId,
      organizationId,
      role: { in: ["owner", "admin"] },
    },
  })

  return !!membership
}

/**
 * Get a specific team member's role
 */
export async function getTeamMemberRole(
  userId: string
): Promise<string | null> {
  const { organizationId } = await getAuthContext()

  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId,
      organizationId,
    },
    select: { role: true },
  })

  return membership?.role ?? null
}
