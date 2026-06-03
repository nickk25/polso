"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

interface UpdateRegionalSettingsInput {
  currency: string
  timezone: string
  fiscalYearStart: number
  dateFormat: string
}

const VALID_CURRENCIES = ["EUR", "USD", "GBP", "MXN", "COP", "ARS", "CLP", "PEN"]
const VALID_DATE_FORMATS = ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]

export async function updateRegionalSettingsAction(
  input: UpdateRegionalSettingsInput
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden cambiar esta configuración", "FORBIDDEN")
    }

    if (!VALID_CURRENCIES.includes(input.currency)) {
      return errorResponse("Moneda no válida", "VALIDATION_ERROR")
    }

    if (!VALID_DATE_FORMATS.includes(input.dateFormat)) {
      return errorResponse("Formato de fecha no válido", "VALIDATION_ERROR")
    }

    if (!Number.isInteger(input.fiscalYearStart) || input.fiscalYearStart < 1 || input.fiscalYearStart > 12) {
      return errorResponse("El mes de inicio del año fiscal debe ser entre 1 y 12", "VALIDATION_ERROR")
    }

    if (!input.timezone || input.timezone.length > 100) {
      return errorResponse("Zona horaria no válida", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        currency: input.currency,
        timezone: input.timezone,
        fiscalYearStart: input.fiscalYearStart,
        dateFormat: input.dateFormat,
      },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar las preferencias regionales", "ERROR")
  }
}
