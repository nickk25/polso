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
      return errorResponse("FORBIDDEN", "Solo las asesorías pueden reenviar invitaciones")
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.organizationId },
      include: { organization: { select: { name: true } } },
    })

    if (!invitation) {
      return errorResponse("NOT_FOUND", "Invitación no encontrada")
    }

    if (invitation.status !== "pending") {
      return errorResponse("VALIDATION_ERROR", "Solo se pueden reenviar invitaciones pendientes")
    }

    if (invitation.expiresAt < new Date()) {
      return errorResponse("VALIDATION_ERROR", "Esta invitación ha expirado")
    }

    // Rate-limit: once per hour
    if (invitation.emailSentAt && invitation.emailSentAt > new Date(Date.now() - 1000 * 60 * 60)) {
      return errorResponse("RATE_LIMITED", "Ya se envió un email hace menos de una hora")
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
      return errorResponse("ERROR", "No se pudo enviar el email")
    }

    revalidatePath("/clients")

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo reenviar la invitación")
  }
}
