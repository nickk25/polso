import { prisma } from "@/lib/db"

export interface InvitationDetails {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  createdAt: Date
  organizationId: string
  organizationName: string
  clientName: string | null
}

/**
 * Get an invitation by its token
 * Returns null if not found
 */
export async function getInvitationByToken(
  token: string
): Promise<InvitationDetails | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!invitation) {
    return null
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    organizationId: invitation.organization.id,
    organizationName: invitation.organization.name,
    clientName: invitation.clientName ?? null,
  }
}

/**
 * Validate an invitation token
 * Returns the invitation details if valid, or an error status
 */
export async function validateInvitationToken(token: string): Promise<
  | { valid: true; invitation: InvitationDetails }
  | { valid: false; reason: "not_found" | "expired" | "already_accepted" | "revoked" }
> {
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return { valid: false, reason: "not_found" }
  }

  if (invitation.status === "accepted") {
    return { valid: false, reason: "already_accepted" }
  }

  if (invitation.status === "revoked") {
    return { valid: false, reason: "revoked" }
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, reason: "expired" }
  }

  return { valid: true, invitation }
}
