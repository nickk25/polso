import { prisma } from "@/lib/db"

export interface UserClientOrg {
  id: string
  name: string
}

export async function getUserClientOrgs(userId: string): Promise<UserClientOrg[]> {
  const rows = await prisma.userOrganization.findMany({
    where: {
      userId,
      organization: { type: "client" },
    },
    select: {
      organization: { select: { id: true, name: true } },
    },
  })

  return rows.map((r) => r.organization)
}
