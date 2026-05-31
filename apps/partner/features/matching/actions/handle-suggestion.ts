"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function confirmSuggestionAction(
  suggestionId: string,
  clientId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { id: suggestionId, organizationId: clientId },
    })

    if (!suggestion) return errorResponse("NOT_FOUND", "Sugerencia no encontrada")

    // Verify partner has access to this client
    const link = await prisma.partnerClient.findFirst({
      where: {
        partnerId: ctx.organizationId,
        clientId,
        status: "active",
      },
    })

    if (!link) return errorResponse("FORBIDDEN", "Sin acceso a este cliente")

    const { transactionId, inboxItemId } = suggestion

    const [inboxItemTax, existingEntry] = await Promise.all([
      prisma.inboxItem.findUnique({ where: { id: inboxItemId }, select: { taxAmount: true, taxRate: true } }),
      prisma.entry.findFirst({ where: { transactionId, organizationId: clientId }, select: { taxAmount: true, taxRate: true } }),
    ])

    const taxData: { taxAmount?: number; taxRate?: number } = {}
    if (inboxItemTax?.taxAmount != null && existingEntry?.taxAmount == null) {
      taxData.taxAmount = Number(inboxItemTax.taxAmount)
    }
    if (inboxItemTax?.taxRate != null && existingEntry?.taxRate == null) {
      taxData.taxRate = inboxItemTax.taxRate
    }

    await prisma.$transaction([
      prisma.matchSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: "confirmed",
          userActionAt: new Date(),
          userActionBy: ctx.userId,
        },
      }),
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
        create: { transactionId, inboxItemId },
        update: {},
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId },
      }),
      prisma.entry.updateMany({
        where: { transactionId, organizationId: clientId },
        data: { status: "verified", ...taxData },
      }),
    ])

    revalidatePath(`/clients/${clientId}/conciliation`)
    revalidatePath(`/clients/${clientId}`)

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo confirmar el match")
  }
}

export async function declineSuggestionAction(
  suggestionId: string,
  clientId: string
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()

    const link = await prisma.partnerClient.findFirst({
      where: {
        partnerId: ctx.organizationId,
        clientId,
        status: "active",
      },
    })

    if (!link) return errorResponse("FORBIDDEN", "Sin acceso a este cliente")

    await prisma.matchSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "declined",
        userActionAt: new Date(),
        userActionBy: ctx.userId,
      },
    })

    revalidatePath(`/clients/${clientId}/conciliation`)

    return successResponse(undefined)
  } catch {
    return errorResponse("ERROR", "No se pudo rechazar el match")
  }
}
