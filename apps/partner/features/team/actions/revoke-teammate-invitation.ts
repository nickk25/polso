"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function revokeTeammateInvitationAction(
  invitationId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden revocar invitaciones", "FORBIDDEN")
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: ctx.organizationId },
    })

    if (!invitation) {
      return errorResponse("Invitación no encontrada", "NOT_FOUND")
    }

    if (invitation.status !== "pending") {
      return errorResponse("Solo se pueden revocar invitaciones pendientes", "VALIDATION_ERROR")
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "revoked" },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo revocar la invitación", "ERROR")
  }
}
