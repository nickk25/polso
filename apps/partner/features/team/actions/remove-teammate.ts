"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function removeTeammateAction(
  userOrgId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden gestionar miembros", "FORBIDDEN")
    }

    const membership = await prisma.userOrganization.findFirst({
      where: { id: userOrgId, organizationId: ctx.organizationId },
      select: { userId: true },
    })

    if (!membership) {
      return errorResponse("Miembro no encontrado", "NOT_FOUND")
    }

    if (membership.userId === ctx.userId) {
      return errorResponse("No puedes eliminarte a ti mismo", "FORBIDDEN")
    }

    const adminCount = await prisma.userOrganization.count({
      where: { organizationId: ctx.organizationId, role: "admin" },
    })

    if (adminCount <= 1) {
      return errorResponse("No puedes eliminar al último administrador", "LAST_ADMIN")
    }

    await prisma.userOrganization.delete({ where: { id: userOrgId } })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo eliminar el miembro", "ERROR")
  }
}
