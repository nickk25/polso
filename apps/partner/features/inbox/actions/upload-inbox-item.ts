"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { uploadFile } from "@polso/storage"
import { processInboxItem } from "@polso/inbox"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { nanoid } from "nanoid"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

export interface UploadInboxItemInput {
  clientId: string
  files: Array<{
    fileName: string
    fileData: string // base64
    contentType: string
    fileSize: number
  }>
}

export async function uploadInboxItemAction(
  input: UploadInboxItemInput
): Promise<ActionResponse<{ ids: string[] }>> {
  try {
    const ctx = await getPartnerAuthContext()

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId: input.clientId, status: "active" },
    })
    if (!link) return errorResponse("Client not found", "NOT_FOUND")

    for (const f of input.files) {
      if (!UPLOAD_ACCEPTED_TYPES.includes(f.contentType)) {
        return errorResponse(`Tipo de archivo no soportado: ${f.fileName}`, "VALIDATION_ERROR")
      }
      if (f.fileSize > UPLOAD_MAX_FILE_SIZE) {
        return errorResponse(`Archivo demasiado grande: ${f.fileName}`, "VALIDATION_ERROR")
      }
    }

    const items = await Promise.all(
      input.files.map(async (f) => {
        const fileId = nanoid()
        const ext = f.fileName.split(".").pop() ?? "bin"
        const key = `inbox/${input.clientId}/${fileId}.${ext}`
        const buffer = Buffer.from(f.fileData, "base64")

        await uploadFile(key, buffer, f.contentType)

        const item = await prisma.inboxItem.create({
          data: {
            organizationId: input.clientId,
            fileName: f.fileName,
            filePath: key,
            contentType: f.contentType,
            size: f.fileSize,
            status: "processing",
            source: "upload",
          },
        })

        return { id: item.id, buffer, contentType: f.contentType }
      })
    )

    for (const { id, buffer, contentType } of items) {
      after(async () => {
        await processInboxItem(input.clientId, id, buffer, contentType)
        revalidatePath(`/clients/${input.clientId}/inbox`)
        revalidatePath(`/clients/${input.clientId}/conciliation`)
      })
    }

    revalidatePath(`/clients/${input.clientId}/inbox`)
    return successResponse({ ids: items.map((i) => i.id) })
  } catch (error) {
    console.error("upload-inbox-item error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error subiendo documento",
      "ERROR"
    )
  }
}
