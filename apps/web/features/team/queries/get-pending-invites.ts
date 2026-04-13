import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface PendingInvite {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  createdAt: Date
  emailStatus: string | null
  emailSentAt: Date | null
}

/**
 * Get all pending invitations for the current organization
 */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { organizationId } = await getAuthContext()

  const invites = await prisma.invitation.findMany({
    where: {
      organizationId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      emailStatus: true,
      emailSentAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return invites
}

/**
 * Get pending invitation count for the current organization
 */
export async function getPendingInviteCount(): Promise<number> {
  const { organizationId } = await getAuthContext()

  return prisma.invitation.count({
    where: {
      organizationId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  })
}

/**
 * Check if an email already has a pending invitation
 */
export async function hasPendingInvite(email: string): Promise<boolean> {
  const { organizationId } = await getAuthContext()

  const invite = await prisma.invitation.findFirst({
    where: {
      organizationId,
      email: email.toLowerCase(),
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  })

  return !!invite
}
