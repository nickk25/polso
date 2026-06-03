"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendPartnerClientInvited } from "@polso/email/send"

interface InviteClientInput {
  clientName: string
  email: string
}

export async function inviteClientAction(
  input: InviteClientInput
): Promise<ActionResponse<{ invitationId: string }>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden invitar clientes", "FORBIDDEN")
    }

    const { user } = await neonAuth()

    const [partnerOrg] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { name: true, invitationExpiryDays: true },
      }),
    ])

    if (!partnerOrg) {
      return errorResponse("No se encontró la organización", "NOT_FOUND")
    }

    const normalizedEmail = input.email.toLowerCase().trim()
    const token = nanoid(32)

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        role: "partner_client",
        token,
        clientName: input.clientName.trim(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (partnerOrg.invitationExpiryDays ?? 7)),
        invitedById: ctx.userId,
      },
    })

    // Send invitation email (keep invitation even if email fails)
    try {
      const partnerName = user?.name ?? user?.email ?? "Tu asesoría"
      const result = await sendPartnerClientInvited(
        normalizedEmail,
        partnerName,
        partnerOrg.name,
        input.clientName.trim(),
        token,
      )

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          resendEmailId: result?.data?.id,
        },
      })
    } catch (emailError) {
      console.error("Failed to send partner client invitation email:", emailError)
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
    }

    revalidatePath("/clients")
    revalidatePath("/")

    return successResponse({ invitationId: invitation.id })
  } catch {
    return errorResponse("No se pudo enviar la invitación", "ERROR")
  }
}

export async function disconnectClientAction(
  clientId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    await prisma.partnerClient.updateMany({
      where: { partnerId: ctx.organizationId, clientId },
      data: { status: "disconnected" },
    })

    revalidatePath("/clients")
    revalidatePath("/")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo desconectar el cliente", "ERROR")
  }
}
