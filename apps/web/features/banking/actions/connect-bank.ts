"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { createTinkClient } from "@polso/banking"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

function getTinkClient() {
  return createTinkClient({
    clientId: process.env.TINK_CLIENT_ID!,
    clientSecret: process.env.TINK_CLIENT_SECRET!,
    redirectUri: process.env.TINK_REDIRECT_URI!,
  })
}

/**
 * Disconnect a bank account by deleting the Tink credential.
 * Keeps transactions and expenses for historical records.
 */
export async function disconnectBankAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: { id: accountId, organizationId },
      select: { tinkAccessToken: true, tinkCredentialId: true },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    // Revoke the Tink credential if token exists
    if (account.tinkAccessToken && account.tinkCredentialId) {
      try {
        const tink = getTinkClient()
        await tink.deleteCredential(account.tinkAccessToken, account.tinkCredentialId)
      } catch (error) {
        console.warn("Failed to delete Tink credential:", error)
      }
    }

    // Mark all accounts sharing the same credential as disconnected
    // preserving all historical transactions and expenses
    if (account.tinkCredentialId) {
      await prisma.account.updateMany({
        where: { tinkCredentialId: account.tinkCredentialId, organizationId },
        data: {
          status: "disconnected",
          tinkAccessToken: null,
          tinkRefreshToken: null,
          tinkTokenExpiresAt: null,
          syncPageToken: null,
          syncError: null,
        },
      })
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: "disconnected",
          tinkAccessToken: null,
          tinkRefreshToken: null,
          tinkTokenExpiresAt: null,
          syncPageToken: null,
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
 * Update account status to active (called after re-authentication via Tink Link)
 */
export async function refreshBankConnectionAction(
  accountId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    const account = await prisma.account.findFirst({
      where: { id: accountId, organizationId },
    })

    if (!account) {
      return errorResponse("Account not found", "NOT_FOUND")
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { status: "active", syncError: null },
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
