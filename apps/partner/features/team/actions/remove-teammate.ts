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

    // Verify caller has permission to remove members
    const callerMembership = await prisma.userOrganization.findFirst({
      where: { userId: ctx.userId, organizationId: ctx.organizationId },
      select: { role: true },
    })

    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return errorResponse("No tienes permisos para eliminar miembros", "FORBIDDEN")
    }

    const membership = await prisma.userOrganization.findFirst({
      where: { id: userOrgId, organizationId: ctx.organizationId },
      select: { userId: true, role: true },
    })

    if (!membership) {
      return errorResponse("Miembro no encontrado", "NOT_FOUND")
    }

    if (membership.userId === ctx.userId) {
      return errorResponse("No puedes eliminarte a ti mismo", "FORBIDDEN")
    }

    if (membership.role === "owner") {
      return errorResponse("No se puede eliminar al propietario", "FORBIDDEN")
    }

    await prisma.userOrganization.delete({ where: { id: userOrgId } })

    revalidatePath("/settings")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo eliminar el miembro", "ERROR")
  }
}
