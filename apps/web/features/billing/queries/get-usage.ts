import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export interface OrganizationUsage {
  bankConnections: number
  users: number
}

/**
 * Get the current organization's usage counts for limit checks
 */
export async function getOrganizationUsage(): Promise<OrganizationUsage> {
  const { organizationId } = await getAuthContext()

  const [bankConnections, users] = await Promise.all([
    // Count active bank connections (not disconnected)
    prisma.account.count({
      where: {
        organizationId,
        status: { not: "disconnected" },
      },
    }),
    // Count organization members
    prisma.userOrganization.count({
      where: { organizationId },
    }),
  ])

  return {
    bankConnections,
    users,
  }
}

/**
 * Get usage by organization ID (for internal use)
 */
export async function getOrganizationUsageById(
  organizationId: string
): Promise<OrganizationUsage> {
  const [bankConnections, users] = await Promise.all([
    prisma.account.count({
      where: {
        organizationId,
        status: { not: "disconnected" },
      },
    }),
    prisma.userOrganization.count({
      where: { organizationId },
    }),
  ])

  return {
    bankConnections,
    users,
  }
}

/**
 * Get bank connection count only
 */
export async function getBankConnectionCount(): Promise<number> {
  const { organizationId } = await getAuthContext()

  return prisma.account.count({
    where: {
      organizationId,
      status: { not: "disconnected" },
    },
  })
}

/**
 * Get user count only
 */
export async function getUserCount(): Promise<number> {
  const { organizationId } = await getAuthContext()

  return prisma.userOrganization.count({
    where: { organizationId },
  })
}
