"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { removeItem } from "../lib/plaid-client"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

/**
 * Disconnect a bank account by removing the Plaid Item
 * Keeps transactions and expenses for historical records
 */
export async function disconnectBankAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    // Get the account
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
      select: { plaidAccessToken: true, plaidItemId: true },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    // Remove from Plaid if access token exists
    if (account.plaidAccessToken) {
      try {
        await removeItem(account.plaidAccessToken)
      } catch (error) {
        // Log but don't fail - the item might already be removed
        console.warn("Failed to remove Plaid item:", error)
      }
    }

    // Mark accounts as disconnected instead of deleting
    // This preserves all transactions and expenses for historical records
    if (account.plaidItemId) {
      await prisma.account.updateMany({
        where: {
          plaidItemId: account.plaidItemId,
          organizationId,
        },
        data: {
          status: "disconnected",
          plaidAccessToken: null, // Token is revoked, clear it
          plaidCursor: null, // Reset cursor for fresh sync on reconnect
          syncError: null, // Clear any sync errors
        },
      })
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: "disconnected",
          plaidAccessToken: null,
          plaidCursor: null,
          syncError: null,
        },
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
 * Update account status (called after re-authentication)
 */
export async function refreshBankConnectionAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        organizationId,
      },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    // Update status to active
    await prisma.account.update({
      where: { id: accountId },
      data: {
        status: "active",
        syncError: null,
      },
    })

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
