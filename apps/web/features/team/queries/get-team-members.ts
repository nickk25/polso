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
      memberName: true,
      memberEmail: true,
      memberImage: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // Lazy backfill: if the current user's row is missing fields that the session has,
  // persist them now so other members see them too on next load.
  const me = members.find((m) => m.userId === currentUser?.id)
  if (currentUser && me) {
    const needsName  = me.memberName  == null && currentUser.name  != null
    const needsEmail = me.memberEmail == null && currentUser.email != null
    const needsImage = me.memberImage == null && currentUser.image != null
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

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    createdAt: m.createdAt,
    name: m.memberName,
    email: m.memberEmail,
    image: m.memberImage,
  }))
}

export async function getTeamMemberCount(): Promise<number> {
  const { organizationId } = await getAuthContext()

  return prisma.userOrganization.count({
    where: { organizationId },
  })
}

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
