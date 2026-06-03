"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { uploadFile, deleteFile } from "@polso/storage"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
const MAX_SIZE = 1 * 1024 * 1024 // 1 MB

interface UploadLogoInput {
  fileName: string
  fileData: string // base64
  contentType: string
  fileSize: number
}

export async function uploadOrganizationLogoAction(
  input: UploadLogoInput
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    if (ctx.orgType !== "partner") {
      return errorResponse("Solo las asesorías pueden subir logos", "FORBIDDEN")
    }

    if (!ALLOWED_TYPES.includes(input.contentType)) {
      return errorResponse("Tipo de archivo no soportado. Usa PNG, JPG, WebP o SVG.", "VALIDATION_ERROR")
    }
    if (input.fileSize > MAX_SIZE) {
      return errorResponse("El archivo es demasiado grande. Máximo 1 MB.", "VALIDATION_ERROR")
    }

    const ext = input.fileName.split(".").pop() ?? "png"
    const key = `org-logos/${ctx.organizationId}/${nanoid(16)}.${ext}`
    const buffer = Buffer.from(input.fileData, "base64")

    await uploadFile(key, buffer, input.contentType)

    // Get old key before updating, then delete it after (avoid orphan if update fails)
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { logoFilePath: true },
    })
    const oldKey = org?.logoFilePath

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { logoFilePath: key },
    })

    if (oldKey) {
      try {
        await deleteFile(oldKey)
      } catch {
        // Non-fatal — old file cleanup failure shouldn't block the user
        console.error("Failed to delete old org logo:", oldKey)
      }
    }

    revalidatePath("/settings")
    revalidatePath("/")

    return successResponse(undefined)
  } catch {
    return errorResponse("No se pudo subir el logo", "ERROR")
  }
}
