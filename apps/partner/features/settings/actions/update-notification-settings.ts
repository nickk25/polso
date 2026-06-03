"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

const VALID_CADENCES = ["none", "daily", "weekly"] as const

interface UpdateNotificationSettingsInput {
  digestCadence: string
  notifyOnClientConnected: boolean
}

export async function updateNotificationSettingsAction(
  input: UpdateNotificationSettingsInput
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden cambiar esta configuración", "FORBIDDEN")
    }

    if (!VALID_CADENCES.includes(input.digestCadence as never)) {
      return errorResponse("Cadencia no válida", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        digestCadence: input.digestCadence,
        notifyOnClientConnected: input.notifyOnClientConnected,
      },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar las notificaciones", "ERROR")
  }
}
