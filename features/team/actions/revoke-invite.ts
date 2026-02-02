"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

/**
 * Revoke a pending invitation
 */
export async function revokeInviteAction(
  invitationId: string
): Promise<ActionResponse<void>> {
  try {
    const { userId, organizationId } = await getAuthContext()

    // Check if user is admin or owner
    const membership = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ["owner", "admin"] },
      },
    })

    if (!membership) {
      return errorResponse("Only admins can revoke invitations", "FORBIDDEN")
    }

    // Get the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
    })

    if (!invitation) {
      return errorResponse("Invitation not found", "NOT_FOUND")
    }

    if (invitation.status !== "pending") {
      return errorResponse(
        `Cannot revoke invitation with status: ${invitation.status}`,
        "INVALID_STATUS"
      )
    }

    // Update status to revoked
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "revoked" },
    })

    revalidatePath("/settings/team")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error revoking invitation:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to revoke invitation",
      "ERROR"
    )
  }
}
