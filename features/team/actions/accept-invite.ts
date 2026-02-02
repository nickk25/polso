"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendUserAcceptedInvite } from "@/lib/email/send"
import { validateInvitationToken } from "../queries/get-invitation-by-token"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface AcceptInviteResult {
  organizationId: string
  organizationName: string
}

/**
 * Accept an invitation to join an organization
 * User must be logged in
 */
export async function acceptInviteAction(
  token: string
): Promise<ActionResponse<AcceptInviteResult>> {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return errorResponse("You must be logged in to accept an invitation", "UNAUTHORIZED")
    }

    // Validate the token
    const validation = await validateInvitationToken(token)

    if (!validation.valid) {
      const messages: Record<typeof validation.reason, string> = {
        not_found: "Invitation not found",
        expired: "This invitation has expired",
        already_accepted: "This invitation has already been accepted",
        revoked: "This invitation has been revoked",
      }
      return errorResponse(messages[validation.reason], validation.reason.toUpperCase())
    }

    const { invitation } = validation

    // Check if email matches (case-insensitive)
    const userEmail = user.email?.toLowerCase()
    if (userEmail && userEmail !== invitation.email.toLowerCase()) {
      return errorResponse(
        `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
        "EMAIL_MISMATCH"
      )
    }

    // Check if user is already a member of this organization
    const existingMembership = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: invitation.organizationId,
      },
    })

    if (existingMembership) {
      // Mark invitation as accepted even though user is already a member
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      })

      return errorResponse("You are already a member of this organization", "ALREADY_MEMBER")
    }

    // Create the user organization membership
    await prisma.$transaction(async (tx) => {
      // Create membership
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      })

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      })
    })

    // Log the join event (notification system would require storing user emails)
    console.log(`User ${user.email} joined ${invitation.organizationName}`)

    revalidatePath("/settings/team")
    revalidatePath("/dashboard")

    return successResponse({
      organizationId: invitation.organizationId,
      organizationName: invitation.organizationName,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to accept invitation",
      "ERROR"
    )
  }
}
