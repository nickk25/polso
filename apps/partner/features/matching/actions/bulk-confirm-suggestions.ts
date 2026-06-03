"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

async function confirmOne(
  suggestionId: string,
  clientId: string,
  userId: string,
): Promise<boolean> {
  try {
    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { id: suggestionId, organizationId: clientId },
    })
    if (!suggestion) return false

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
        data: { status: "confirmed", userActionAt: new Date(), userActionBy: userId },
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
        where: { transactionId, organizationId: clientId, status: { not: "verified" } },
        data: { status: "verified", ...taxData },
      }),
    ])

    return true
  } catch {
    return false
  }
}

export async function bulkConfirmSuggestionsAction(
  clientId: string,
  suggestionIds: string[],
): Promise<ActionResponse<{ confirmed: number }>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId, status: "active" },
    })
    if (!link) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const results = await Promise.all(
      suggestionIds.map((id) => confirmOne(id, clientId, ctx.userId))
    )
    const confirmed = results.filter(Boolean).length

    revalidatePath(`/clients/${clientId}/conciliation`)
    revalidatePath(`/clients/${clientId}/inbox`)
    revalidatePath(`/clients/${clientId}`)

    return successResponse({ confirmed })
  } catch (error) {
    console.error("bulkConfirmSuggestions error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al confirmar los matches",
      "ERROR"
    )
  }
}
