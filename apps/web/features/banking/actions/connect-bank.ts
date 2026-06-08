"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { getGoCardlessClient } from "@/features/banking/lib/gocardless-client"

/**
 * Disconnect a bank account by deleting the GoCardless requisition.
 * Keeps all historical transactions and expenses.
 */
export async function disconnectBankAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: { id: accountId, organizationId },
      select: { requisitionId: true },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    // Revoke the GoCardless requisition (covers all accounts from this bank connection)
    if (account.requisitionId) {
      try {
        const gc = getGoCardlessClient()
        await gc.deleteRequisition(account.requisitionId)
      } catch (error) {
        console.warn("[disconnect] Failed to delete GoCardless requisition — queued for retry:", error)
        await prisma.requisitionCleanupQueue.upsert({
          where: { requisitionId: account.requisitionId },
          create: { requisitionId: account.requisitionId, organizationId, lastError: String(error) },
          update: { lastError: String(error) },
        }).catch(() => {})
      }

      // Mark all accounts sharing the same requisition as disconnected
      await prisma.account.updateMany({
        where: { requisitionId: account.requisitionId, organizationId },
        data: {
          status: "disconnected",
          syncError: null,
          syncErrorRetries: 0,
        },
      })
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: { status: "disconnected", syncError: null, syncErrorRetries: 0 },
      })
    }

    revalidatePath("/settings/banking")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error disconnecting bank:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to disconnect bank",
      "ERROR"
    )
  }
}

/**
 * Reconnect an expired bank account: delete the old GoCardless requisition
 * before the user starts a new connection, avoiding double-billing.
 * Returns the create-link URL to redirect the user to their bank.
 */
export async function reconnectBankAction(
  accountId: string
): Promise<ActionResponse<{ link: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: { id: accountId, organizationId },
      select: { requisitionId: true, institutionId: true },
    })

    if (!account) return errorResponse("Account not found", "NOT_FOUND")

    // Delete old requisition from GoCardless BEFORE creating a new one
    if (account.requisitionId) {
      try {
        const gc = getGoCardlessClient()
        await gc.deleteRequisition(account.requisitionId)
      } catch (error) {
        console.warn("[reconnect] Failed to delete old requisition — queued for retry:", error)
        await prisma.requisitionCleanupQueue.upsert({
          where: { requisitionId: account.requisitionId },
          create: { requisitionId: account.requisitionId, organizationId, lastError: String(error) },
          update: { lastError: String(error) },
        }).catch(() => {})
      }

      await prisma.account.updateMany({
        where: { requisitionId: account.requisitionId, organizationId },
        data: { status: "disconnected", syncError: null, syncErrorRetries: 0, requisitionId: null },
      })
    }

    revalidatePath("/settings/banking")
    return successResponse({ link: `/settings/banking/connect?institutionId=${account.institutionId}` })
  } catch (error) {
    console.error("Error reconnecting bank:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to reconnect bank",
      "ERROR"
    )
  }
}

/**
 * Mark accounts as active after the user completes re-authentication.
 */
export async function refreshBankConnectionAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: { id: accountId, organizationId },
      select: { id: true, requisitionId: true },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    // Reset all accounts under the same requisition
    if (account.requisitionId) {
      await prisma.account.updateMany({
        where: { requisitionId: account.requisitionId, organizationId },
        data: { status: "active", syncError: null, syncErrorRetries: 0 },
      })
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: { status: "active", syncError: null, syncErrorRetries: 0 },
      })
    }

    revalidatePath("/settings/banking")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error refreshing bank connection:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to refresh connection",
      "ERROR"
    )
  }
}
