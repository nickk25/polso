"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

const VALID_RANGES = ["month", "quarter", "year"] as const
type ExportRange = (typeof VALID_RANGES)[number]

export async function updateExportDefaultsAction(
  range: ExportRange
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden cambiar esta configuración", "FORBIDDEN")
    }

    if (!VALID_RANGES.includes(range)) {
      return errorResponse("Rango no válido", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { defaultExportRange: range },
    })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar el rango por defecto", "ERROR")
  }
}
