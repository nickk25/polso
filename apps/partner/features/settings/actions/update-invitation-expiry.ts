"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function updateInvitationExpiryAction(
  days: number
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden cambiar esta configuración", "FORBIDDEN")
    }

    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return errorResponse("La caducidad debe ser entre 1 y 30 días", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { invitationExpiryDays: days },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar la caducidad de invitaciones", "ERROR")
  }
}
