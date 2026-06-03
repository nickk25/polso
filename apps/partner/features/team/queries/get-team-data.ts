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
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        memberName: true,
        memberEmail: true,
        memberImage: true,
      },
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

  // Lazy backfill: persist current user's session data into their row if missing.
  const me = members.find((m) => m.userId === currentUser?.id)
  if (currentUser && me) {
    const needsName  = !me.memberName  && !!currentUser.name
    const needsEmail = !me.memberEmail && !!currentUser.email
    const needsImage = !me.memberImage && !!currentUser.image
    if (needsName || needsEmail || needsImage) {
      const patch = {
        ...(needsName  && { memberName:  currentUser.name }),
        ...(needsEmail && { memberEmail: currentUser.email }),
        ...(needsImage && { memberImage: currentUser.image }),
      }
      await prisma.userOrganization.update({ where: { id: me.id }, data: patch })
      Object.assign(me, patch)
    }
  }

  const resolvedMembers: TeamMember[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    createdAt: m.createdAt,
    name: m.memberName || null,
    email: m.memberEmail || null,
    image: m.memberImage || null,
  }))

  return { members: resolvedMembers, invitations }
}
