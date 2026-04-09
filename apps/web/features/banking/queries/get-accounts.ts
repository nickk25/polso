import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export async function getAccounts(includeDisconnected = false) {
  const { organizationId } = await getAuthContext()

  return prisma.account.findMany({
    where: {
      organizationId,
      ...(!includeDisconnected && { status: { not: "disconnected" } }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
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

export interface AccountsSummary {
  totalAvailable: number
  totalCurrent: number
  totalLimit: number
  accountCount: number
  lastSyncedAt: Date | null
  currency: string
}

export async function getAccountsSummary(): Promise<AccountsSummary> {
  const { organizationId } = await getAuthContext()

  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      status: "active",
    },
    select: {
      balanceAvailable: true,
      balanceCurrent: true,
      balanceLimit: true,
      lastSyncedAt: true,
      currency: true,
    },
  })

  const summary = accounts.reduce(
    (acc, account) => ({
      totalAvailable: acc.totalAvailable + (account.balanceAvailable || 0),
      totalCurrent: acc.totalCurrent + (account.balanceCurrent || 0),
      totalLimit: acc.totalLimit + (account.balanceLimit || 0),
    }),
    { totalAvailable: 0, totalCurrent: 0, totalLimit: 0 }
  )

  // Get the most recent sync time
  const lastSyncedAt = accounts.reduce((latest: Date | null, account) => {
    if (!account.lastSyncedAt) return latest
    if (!latest) return account.lastSyncedAt
    return account.lastSyncedAt > latest ? account.lastSyncedAt : latest
  }, null)

  // Use first account's currency or default to USD
  const currency = accounts[0]?.currency || "USD"

  return {
    ...summary,
    accountCount: accounts.length,
    lastSyncedAt,
    currency,
  }
}
