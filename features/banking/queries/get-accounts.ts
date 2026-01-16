import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export async function getAccounts() {
  const { organizationId } = await getAuthContext()

  return prisma.account.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAccount(id: string) {
  const { organizationId } = await getAuthContext()

  return prisma.account.findFirst({
    where: {
      id,
      organizationId,
    },
  })
}

export async function getAccountsWithBalance() {
  const { organizationId } = await getAuthContext()

  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  })

  const totalBalance = accounts.reduce(
    (sum: number, account: { balanceAvailable: number | null }) => sum + (account.balanceAvailable || 0),
    0
  )

  return { accounts, totalBalance }
}
