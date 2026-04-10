"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { uploadFile } from "@polso/storage"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { nanoid } from "nanoid"

export interface UploadInboxItemInput {
  clientId: string
  fileName: string
  fileData: string  // base64
  contentType: string
  fileSize: number
  displayName?: string
  amount?: number
  currency?: string
  date?: string // ISO date string
}

export async function uploadInboxItemAction(
  input: UploadInboxItemInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const ctx = await getPartnerAuthContext()

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId: input.clientId, status: "active" },
    })
    if (!link) return errorResponse("Client not found", "NOT_FOUND")

    const fileId = nanoid()
    const ext = input.fileName.split(".").pop() ?? "bin"
    const key = `inbox/${input.clientId}/${fileId}.${ext}`

    const buffer = Buffer.from(input.fileData, "base64")
    await uploadFile(key, buffer, input.contentType)

    const item = await prisma.inboxItem.create({
      data: {
        organizationId: input.clientId,
        fileName: input.fileName,
        filePath: key,
        contentType: input.contentType,
        size: input.fileSize,
        displayName: input.displayName || null,
        amount: input.amount ?? null,
        currency: input.currency ?? "EUR",
        date: input.date ? new Date(input.date) : null,
        status: "new",
        source: "upload",
      },
    })

    revalidatePath(`/clients/${input.clientId}/inbox`)
    return successResponse({ id: item.id })
  } catch (error) {
    console.error("upload-inbox-item error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error subiendo documento",
      "ERROR"
    )
  }
}
