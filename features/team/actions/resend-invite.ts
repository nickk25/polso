"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendUserInvited } from "@/lib/email/send"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

/**
 * Resend an invitation email
 */
export async function resendInviteAction(
  invitationId: string
): Promise<ActionResponse<void>> {
  try {
    const { userId, organizationId } = await getAuthContext()
    const { user } = await neonAuth()

    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED")
    }

    // Check if user is admin or owner
    const membership = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ["owner", "admin"] },
      },
    })

    if (!membership) {
      return errorResponse("Only admins can resend invitations", "FORBIDDEN")
    }

    // Get the invitation with organization details
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    })

    if (!invitation) {
      return errorResponse("Invitation not found", "NOT_FOUND")
    }

    if (invitation.status !== "pending") {
      return errorResponse(
        `Cannot resend invitation with status: ${invitation.status}`,
        "INVALID_STATUS"
      )
    }

    if (invitation.expiresAt < new Date()) {
      return errorResponse(
        "This invitation has expired. Please create a new invitation.",
        "EXPIRED"
      )
    }

    // Resend the email
    try {
      const inviterName = user.name ?? user.email ?? "A team member"
      const result = await sendUserInvited(
        invitation.email,
        inviterName,
        invitation.organization.name,
        invitation.token
      )

      // Update email tracking
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          emailError: null,
          resendEmailId: result?.data?.id,
        },
      })
    } catch (emailError) {
      console.error("Failed to resend invitation email:", emailError)

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })

      return errorResponse("Failed to send invitation email", "EMAIL_FAILED")
    }

    revalidatePath("/settings/team")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error resending invitation:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to resend invitation",
      "ERROR"
    )
  }
}
