"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { neonAuth } from "@neondatabase/auth/next/server"
import { sendPartnerClientInvited } from "@polso/email/send"

export async function updatePartnerInviteEmailAction(
  invitationId: string,
  newEmail: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("FORBIDDEN", "Solo las asesorías pueden editar invitaciones")
    }

    const normalizedEmail = newEmail.toLowerCase().trim()
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return errorResponse("VALIDATION_ERROR", "Email inválido")
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.organizationId },
      include: { organization: { select: { name: true } } },
    })

    if (!invitation) {
      return errorResponse("NOT_FOUND", "Invitación no encontrada")
    }

    if (invitation.status !== "pending") {
      return errorResponse("VALIDATION_ERROR", "Solo se pueden editar invitaciones pendientes")
    }

    // Regenerate token so old link stops working
    const newToken = nanoid(32)

    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        email: normalizedEmail,
        token: newToken,
        emailStatus: null,
        emailSentAt: null,
        resendEmailId: null,
        emailError: null,
      },
    })

    // Send to new email
    try {
      const { user } = await neonAuth()
      const partnerName = user?.name ?? user?.email ?? "Tu asesoría"
      const result = await sendPartnerClientInvited(
        normalizedEmail,
        partnerName,
        invitation.organization.name,
        invitation.clientName ?? null,
        newToken,
      )

      await prisma.invitation.update({
        where: { id: updated.id },
        data: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          resendEmailId: result?.data?.id,
        },
      })
    } catch (emailError) {
      console.error("Failed to send updated invitation email:", emailError)
      await prisma.invitation.update({
        where: { id: updated.id },
        data: {
          emailStatus: "failed",
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
    }

    revalidatePath("/clients")

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo actualizar la invitación")
  }
}
