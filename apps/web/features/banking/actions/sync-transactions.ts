"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { getRedis } from "@polso/cache"
import { prisma } from "@/lib/db"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { syncTransactionsCore, type SyncResult } from "@/features/banking/lib/sync-core"

// GoCardless limits bank endpoints to as few as 4 calls/account/day —
// throttle manual syncs so users can't burn the daily quota in a few clicks
const MANUAL_SYNC_COOLDOWN_SECONDS = 30 * 60

// Atomic check-and-set: returns false when the account synced recently.
// Fails open — a Redis outage must not block manual syncs.
async function acquireManualCooldown(accountId: string): Promise<boolean> {
  try {
    const acquired = await getRedis().set(`gc:manual-cooldown:${accountId}`, "1", {
      nx: true,
      ex: MANUAL_SYNC_COOLDOWN_SECONDS,
    })
    return acquired !== null
  } catch {
    return true
  }
}

function revalidateSyncedPaths() {
  revalidatePath("/settings/banking")
  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/analytics")
  revalidatePath("/counterparties")
  revalidatePath("/clients")
}

export async function syncTransactionsAction(
  accountId?: string,
  initial = false
): Promise<ActionResponse<SyncResult>> {
  try {
    const { organizationId } = await getAuthContext()

    let accountIds: string[] | undefined
    if (accountId) {
      if (!(await acquireManualCooldown(accountId))) {
        return errorResponse("Account was synced recently", "RATE_LIMITED")
      }
      accountIds = [accountId]
    } else {
      // Org-wide sync (empty states): skip accounts on cooldown instead of failing
      const accounts = await prisma.account.findMany({
        where: { organizationId, status: "active", requisitionId: { not: null } },
        select: { id: true },
      })
      const allowed: string[] = []
      for (const account of accounts) {
        if (await acquireManualCooldown(account.id)) allowed.push(account.id)
      }
      if (accounts.length > 0 && allowed.length === 0) {
        return errorResponse("Accounts were synced recently", "RATE_LIMITED")
      }
      accountIds = allowed.length > 0 ? allowed : undefined
    }

    const result = await syncTransactionsCore(organizationId, { accountIds, initial })
    revalidateSyncedPaths()

    return successResponse(result)
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to sync transactions",
      "ERROR"
    )
  }
}

// Starts a sync in the background so the SyncMonitor toast can track progress.
// Sets lastSyncedAt: null as the "in progress" signal, then returns immediately.
// Full history is fetched only for accounts that never imported a transaction;
// established accounts use the 7-day window to respect GoCardless rate limits.
export async function startManualSyncAction(accountIds: string[]): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    if (accountIds.length === 0) {
      return errorResponse("No accounts to sync", "VALIDATION_ERROR")
    }

    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, organizationId, status: "active" },
      select: { id: true },
    })
    if (accounts.length === 0) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    const allowed: string[] = []
    for (const account of accounts) {
      if (await acquireManualCooldown(account.id)) allowed.push(account.id)
    }
    if (allowed.length === 0) {
      return errorResponse("Accounts were synced recently", "RATE_LIMITED")
    }

    const hasTransactions = await prisma.transaction.findFirst({
      where: { accountId: { in: allowed } },
      select: { id: true },
    })
    const initial = hasTransactions === null

    await prisma.account.updateMany({
      where: { id: { in: allowed }, organizationId },
      data: { lastSyncedAt: null },
    })

    after(() =>
      syncTransactionsCore(organizationId, { accountIds: allowed, initial })
        .then(() => revalidateSyncedPaths())
        .catch((err) => console.error("[Manual sync] Error:", err))
    )

    return successResponse(undefined)
  } catch (error) {
    console.error("Error starting manual sync:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to start sync",
      "ERROR"
    )
  }
}
