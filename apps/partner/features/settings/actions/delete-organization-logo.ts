"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { deleteFile } from "@polso/storage"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function deleteOrganizationLogoAction(): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden eliminar logos", "FORBIDDEN")
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { logoFilePath: true },
    })

    if (!org?.logoFilePath) {
      return successResponse(undefined)
    }

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { logoFilePath: null },
    })

    try {
      await deleteFile(org.logoFilePath)
    } catch {
      console.error("Failed to delete org logo file:", org.logoFilePath)
    }

    revalidatePath("/settings")
    revalidatePath("/")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo eliminar el logo", "ERROR")
  }
}
