import { tool } from "ai"
import { z } from "zod"
import { getAccountsWithBalance } from "@/features/banking/queries/get-accounts"

export const listBankAccounts = tool({
  description: "List connected bank accounts with their current balances and sync status.",
  parameters: z.object({
    includeDisconnected: z.boolean().default(false).optional(),
  }),
  execute: async () => {
    const result = await getAccountsWithBalance()
    return {
      accounts: result.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        institutionName: a.institutionName,
        balanceCurrent: a.balanceCurrent,
        balanceAvailable: a.balanceAvailable,
        currency: a.currency,
        status: a.status,
        lastSyncedAt: a.lastSyncedAt,
      })),
      totalBalance: result.totalBalance,
    }
  },
})
