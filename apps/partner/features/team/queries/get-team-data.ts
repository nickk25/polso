import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { neonAuth } from "@neondatabase/auth/next/server"

export interface TeamMember {
  id: string
  userId: string
  role: string
  email: string | null
  name: string | null
  image: string | null
  createdAt: Date
}

export interface TeamInvitation {
  id: string
  email: string
  status: string
  expiresAt: Date
  emailSentAt: Date | null
  token: string
  createdAt: Date
}

export interface TeamData {
  members: TeamMember[]
  invitations: TeamInvitation[]
}

export async function getTeamData(): Promise<TeamData> {
  const ctx = await getPartnerAuthContext()
  const { user: currentUser } = await neonAuth()

  const [members, invitations] = await Promise.all([
    prisma.userOrganization.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, userId: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: "admin",
        status: "pending",
      },
      select: { id: true, email: true, status: true, expiresAt: true, emailSentAt: true, token: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // Resolve names/emails/images: for the current user we have data from neonAuth,
  // others show truncated userId
  const resolvedMembers: TeamMember[] = members.map((m) => {
    if (m.userId === currentUser?.id) {
      return {
        ...m,
        email: currentUser.email ?? null,
        name: currentUser.name ?? null,
        image: currentUser.image ?? null,
      }
    }
    return { ...m, email: null, name: null, image: null }
  })

  return { members: resolvedMembers, invitations }
}
