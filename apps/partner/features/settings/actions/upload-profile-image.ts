"use server"

import { neonAuth } from "@neondatabase/auth/next/server"
import { uploadFile } from "@polso/storage"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024

interface UploadProfileImageInput {
  fileData: string // base64
  contentType: string
  fileSize: number
}

export async function uploadProfileImageAction(
  input: UploadProfileImageInput
): Promise<ActionResponse<{ url: string }>> {
  try {
    const { user } = await neonAuth()
    if (!user) return errorResponse("No autenticado", "FORBIDDEN")

    if (!ALLOWED_TYPES.includes(input.contentType)) {
      return errorResponse("Tipo de archivo no soportado. Usa PNG, JPG o WebP.", "VALIDATION_ERROR")
    }
    if (input.fileSize > MAX_SIZE) {
      return errorResponse("El archivo es demasiado grande. Máximo 2 MB.", "VALIDATION_ERROR")
    }

    const key = `profile-images/${user.id}`
    const buffer = Buffer.from(input.fileData, "base64")
    await uploadFile(key, buffer, input.contentType)

    const base = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const url = `${base}/api/profile-image/${user.id}`

    return successResponse({ url })
  } catch {
    return errorResponse("No se pudo subir la imagen", "ERROR")
  }
}
