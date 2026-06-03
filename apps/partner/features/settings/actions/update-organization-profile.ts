"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

interface UpdateOrganizationProfileInput {
  name: string
  taxId?: string | null
  address?: string | null
  contactEmail?: string | null
}

export async function updateOrganizationProfileAction(
  input: UpdateOrganizationProfileInput
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden editar su perfil", "FORBIDDEN")
    }

    const name = input.name.trim()
    if (!name) {
      return errorResponse("El nombre no puede estar vacío", "VALIDATION_ERROR")
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        name,
        taxId: input.taxId?.trim() || null,
        address: input.address?.trim() || null,
        contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo actualizar el perfil", "ERROR")
  }
}
