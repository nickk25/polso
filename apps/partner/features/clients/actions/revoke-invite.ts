"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function revokePartnerInviteAction(
  invitationId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("FORBIDDEN", "Solo las asesorías pueden revocar invitaciones")
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.organizationId },
    })

    if (!invitation) {
      return errorResponse("NOT_FOUND", "Invitación no encontrada")
    }

    if (invitation.status !== "pending") {
      return errorResponse("VALIDATION_ERROR", "Solo se pueden revocar invitaciones pendientes")
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "revoked" },
    })

    revalidatePath("/clients")

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo revocar la invitación")
  }
}
