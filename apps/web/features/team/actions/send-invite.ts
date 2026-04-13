"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { sendUserInvited } from "@/lib/email/send"
import { generateInviteToken, getInviteExpiryDate } from "../lib/generate-token"
import { requireLimit, LimitExceededError } from "@/features/billing/lib/require-limit"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { neonAuth } from "@neondatabase/auth/next/server"
import { getLocale } from "@/lib/i18n/get-locale"

interface SendInviteInput {
  email: string
  role?: "member" | "admin"
}

interface SendInviteResult {
  invitationId: string
}

/**
 * Send an invitation to join the organization
 */
export async function sendInviteAction(
  input: SendInviteInput
): Promise<ActionResponse<SendInviteResult>> {
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
      return errorResponse("Only admins can invite members", "FORBIDDEN")
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    if (!organization) {
      return errorResponse("Organization not found", "NOT_FOUND")
    }

    // Count current members and pending invites
    const [memberCount, pendingInviteCount] = await Promise.all([
      prisma.userOrganization.count({
        where: { organizationId },
      }),
      prisma.invitation.count({
        where: {
          organizationId,
          status: "pending",
          expiresAt: { gt: new Date() },
        },
      }),
    ])

    // Check limit (members + pending invites)
    const totalCount = memberCount + pendingInviteCount
    try {
      await requireLimit("maxUsers", totalCount)
    } catch (error) {
      if (error instanceof LimitExceededError) {
        return errorResponse(
          `You've reached the ${error.maxAllowed} user limit. Upgrade to add more team members.`,
          "LIMIT_EXCEEDED"
        )
      }
      throw error
    }

    const normalizedEmail = input.email.toLowerCase().trim()

    // Check if user is already a member
    // Note: We can't directly check Neon Auth users, so we check UserOrganization
    // by looking for an existing invitation that was accepted with this email
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId,
        email: normalizedEmail,
        status: "accepted",
      },
    })

    if (existingInvite) {
      return errorResponse("This user is already a member", "ALREADY_MEMBER")
    }

    // Check for pending invite with same email
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId,
        email: normalizedEmail,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingInvite) {
      return errorResponse(
        "An invitation is already pending for this email",
        "ALREADY_INVITED"
      )
    }

    // Generate token and create invitation
    const token = generateInviteToken()
    const expiresAt = getInviteExpiryDate()

    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        email: normalizedEmail,
        role: input.role ?? "member",
        token,
        expiresAt,
        invitedById: userId,
        status: "pending",
      },
    })

    // Send invitation email
    try {
      const locale = await getLocale()
      const inviterName = user.name ?? user.email ?? "A team member"
      const result = await sendUserInvited(
        normalizedEmail,
        inviterName,
        organization.name,
        token,
        locale
      )

      // Update email tracking
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          resendEmailId: result?.data?.id,
        },
      })
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError)

      // Update email status to failed but keep invitation
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
    }

    revalidatePath("/settings/team")

    return successResponse({ invitationId: invitation.id })
  } catch (error) {
    console.error("Error sending invitation:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to send invitation",
      "ERROR"
    )
  }
}
