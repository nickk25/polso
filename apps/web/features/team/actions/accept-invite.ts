"use server"

import { revalidatePath } from "next/cache"
import { prisma, getPartnerNotificationEmail } from "@polso/db"
import { neonAuth } from "@neondatabase/auth/next/server"
import { validateInvitationToken } from "../queries/get-invitation-by-token"
import { getUserClientOrgs } from "../queries/get-user-client-orgs"
import { createClientOrgForUser } from "../lib/ensure-client-org"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { sendPartnerClientConnected } from "@polso/email/send"

type AcceptInviteResult =
  | { kind: "joined"; organizationId: string; organizationName: string }
  | { kind: "needs_org_selection"; availableOrgs: { id: string; name: string }[] }

/**
 * Accept an invitation.
 * For partner_client invitations, pass chosenClientOrgId to select an existing
 * client org to link; omit it to auto-create a new one (or when user has only one).
 */
export async function acceptInviteAction(
  token: string,
  chosenClientOrgId?: string
): Promise<ActionResponse<AcceptInviteResult>> {
  try {
    const { user } = await neonAuth()

    if (!user) {
      return errorResponse("You must be logged in to accept an invitation", "UNAUTHORIZED")
    }

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

    // Check email match (case-insensitive)
    const userEmail = user.email?.toLowerCase()
    if (userEmail && userEmail !== invitation.email.toLowerCase()) {
      return errorResponse(
        `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
        "EMAIL_MISMATCH"
      )
    }

    // ─── Partner-client invitation branch ──────────────────────────────────
    if (invitation.role === "partner_client") {
      const clientOrgs = await getUserClientOrgs(user.id)

      if (clientOrgs.length === 0) {
        // No existing client org — create one inside the transaction
        const newOrg = await prisma.$transaction(async (tx) => {
          const org = await createClientOrgForUser(tx, {
            userId: user.id,
            userEmail: user.email ?? null,
            name: invitation.clientName,
          })

          await tx.partnerClient.upsert({
            where: { partnerId_clientId: { partnerId: invitation.organizationId, clientId: org.id } },
            create: { partnerId: invitation.organizationId, clientId: org.id, status: "active", connectedAt: new Date() },
            update: { status: "active", connectedAt: new Date() },
          })

          await tx.invitation.update({
            where: { id: invitation.id },
            data: { status: "accepted", acceptedAt: new Date() },
          })

          return org
        })

        revalidatePath("/dashboard")
        void notifyPartnerClientConnected(invitation.organizationId, newOrg.id, newOrg.name)
        return successResponse({ kind: "joined", organizationId: newOrg.id, organizationName: newOrg.name })
      }

      // One or more orgs exist — pick one
      const validChosen = chosenClientOrgId && clientOrgs.some((o) => o.id === chosenClientOrgId)
        ? chosenClientOrgId
        : clientOrgs.length === 1
          ? clientOrgs[0].id
          : null

      if (!validChosen) {
        // Multiple orgs, no selection yet — tell the UI to show a picker
        return successResponse({ kind: "needs_org_selection", availableOrgs: clientOrgs })
      }

      const chosenOrg = clientOrgs.find((o) => o.id === validChosen)!

      await prisma.$transaction(async (tx) => {
        await tx.partnerClient.upsert({
          where: { partnerId_clientId: { partnerId: invitation.organizationId, clientId: validChosen } },
          create: { partnerId: invitation.organizationId, clientId: validChosen, status: "active", connectedAt: new Date() },
          update: { status: "active", connectedAt: new Date() },
        })

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "accepted", acceptedAt: new Date() },
        })
      })

      revalidatePath("/dashboard")
      void notifyPartnerClientConnected(invitation.organizationId, validChosen, chosenOrg.name)
      return successResponse({ kind: "joined", organizationId: validChosen, organizationName: chosenOrg.name })
    }
    // ─── End partner-client branch ─────────────────────────────────────────

    // Team invite — check existing membership
    const existingMembership = await prisma.userOrganization.findFirst({
      where: { userId: user.id, organizationId: invitation.organizationId },
    })

    if (existingMembership) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      })
      return errorResponse("You are already a member of this organization", "ALREADY_MEMBER")
    }

    // Create membership
    await prisma.$transaction(async (tx) => {
      await tx.userOrganization.create({
        data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      })
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      })
    })

    console.log(`User ${user.email} joined ${invitation.organizationName}`)

    revalidatePath("/settings/team")
    revalidatePath("/dashboard")

    return successResponse({
      kind: "joined",
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

async function notifyPartnerClientConnected(
  partnerOrgId: string,
  clientOrgId: string,
  clientOrgName: string
) {
  try {
    const partnerOrg = await prisma.organization.findUnique({
      where: { id: partnerOrgId },
      select: { notifyOnClientConnected: true },
    })
    if (!partnerOrg?.notifyOnClientConnected) return

    const recipient = await getPartnerNotificationEmail(partnerOrgId)
    if (!recipient) return

    const partnerAppUrl = process.env.NEXT_PUBLIC_PARTNER_APP_URL ?? ""
    await sendPartnerClientConnected(
      recipient.email,
      recipient.name,
      clientOrgName,
      "joined",
      `${partnerAppUrl}/clients/${clientOrgId}`,
      "es"
    )
  } catch (err) {
    console.error("[accept-invite] partner notify failed:", err)
  }
}
