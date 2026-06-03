import type { PrismaClient } from "@polso/db"

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

export async function createClientOrgForUser(
  tx: Tx,
  args: { userId: string; userEmail: string | null; userName?: string | null; userImage?: string | null; name?: string | null }
): Promise<{ id: string; name: string }> {
  const orgName =
    args.name?.trim() ||
    (args.userEmail ? `${args.userEmail.split("@")[0]}'s Organization` : "My Organization")

  const org = await tx.organization.create({
    data: {
      name: orgName,
      type: "client",
      userOrganizations: {
        create: {
          userId: args.userId,
          role: "owner",
          memberName: args.userName ?? null,
          memberEmail: args.userEmail ?? null,
          memberImage: args.userImage ?? null,
        },
      },
    },
    select: { id: true, name: true },
  })

  return org
}
