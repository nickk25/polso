"use server"

import { revalidatePath } from "next/cache"
import { getAuthContext } from "@polso/auth/get-session"
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
    revalidatePath("/expenses")
    revalidatePath("/incomes")
    revalidatePath("/dashboard")
    revalidatePath("/analytics")
    revalidatePath("/vendors")
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
