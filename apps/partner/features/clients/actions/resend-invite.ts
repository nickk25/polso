"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendPartnerClientInvited } from "@polso/email/send"

export async function resendPartnerInviteAction(
  invitationId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden reenviar invitaciones", "FORBIDDEN")
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.organizationId },
      include: { organization: { select: { name: true } } },
    })

    if (!invitation) {
      return errorResponse("Invitación no encontrada", "NOT_FOUND")
    }

    if (invitation.status !== "pending") {
      return errorResponse("Solo se pueden reenviar invitaciones pendientes", "VALIDATION_ERROR")
    }

    if (invitation.expiresAt < new Date()) {
      return errorResponse("Esta invitación ha expirado", "VALIDATION_ERROR")
    }

    // Rate-limit: once per hour
    if (invitation.emailSentAt && invitation.emailSentAt > new Date(Date.now() - 1000 * 60 * 60)) {
      return errorResponse("Ya se envió un email hace menos de una hora", "RATE_LIMITED")
    }

    const { user } = await neonAuth()

    try {
      const partnerName = user?.name ?? user?.email ?? "Tu asesoría"
      const result = await sendPartnerClientInvited(
        invitation.email,
        partnerName,
        invitation.organization.name,
        invitation.clientName ?? null,
        invitation.token,
      )

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          resendEmailId: result?.data?.id,
          emailError: null,
        },
      })
    } catch (emailError) {
      console.error("Failed to resend partner client invitation email:", emailError)
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
      return errorResponse("No se pudo enviar el email", "ERROR")
    }

    revalidatePath("/clients")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo reenviar la invitación", "ERROR")
  }
}
