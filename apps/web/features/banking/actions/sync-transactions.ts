"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { getAuthContext } from "@polso/auth/get-session"
import { prisma } from "@/lib/db"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { syncTransactionsCore, type SyncResult } from "@/features/banking/lib/sync-core"

export async function syncTransactionsAction(
  accountId?: string,
  initial = false
): Promise<ActionResponse<SyncResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const result = await syncTransactionsCore(organizationId, accountId, initial)

    revalidatePath("/settings/banking")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    revalidatePath("/analytics")
    revalidatePath("/counterparties")
    revalidatePath("/clients")

    return successResponse(result)
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to sync transactions",
      "ERROR"
    )
  }
}

// Starts a full-history sync in the background so the SyncMonitor toast can track progress.
// Sets lastSyncedAt: null as the "in progress" signal, then returns immediately.
export async function startManualSyncAction(accountId: string): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    await prisma.account.update({
      where: { id: accountId, organizationId },
      data: { lastSyncedAt: null },
    })

    after(() =>
      syncTransactionsCore(organizationId, accountId, true)
        .then(() => {
          revalidatePath("/settings/banking")
          revalidatePath("/transactions")
          revalidatePath("/dashboard")
          revalidatePath("/analytics")
          revalidatePath("/counterparties")
          revalidatePath("/clients")
        })
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
