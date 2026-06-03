"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

interface UpdateReminderSettingsInput {
  reminderCooldownHours: number
  receiptReminderHours: number
  autoRemindersEnabled: boolean
}

export async function updateReminderSettingsAction(
  input: UpdateReminderSettingsInput
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden cambiar esta configuración", "FORBIDDEN")
    }

    if (
      !Number.isInteger(input.reminderCooldownHours) ||
      input.reminderCooldownHours < 1 ||
      input.reminderCooldownHours > 168
    ) {
      return errorResponse("El cooldown debe ser entre 1 y 168 horas", "VALIDATION_ERROR")
    }

    if (
      !Number.isInteger(input.receiptReminderHours) ||
      input.receiptReminderHours < 24 ||
      input.receiptReminderHours > 720
    ) {
      return errorResponse("La cadencia de recordatorios debe ser entre 24 y 720 horas", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        reminderCooldownHours: input.reminderCooldownHours,
        receiptReminderHours: input.receiptReminderHours,
        autoRemindersEnabled: input.autoRemindersEnabled,
      },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar la configuración de recordatorios", "ERROR")
  }
}
