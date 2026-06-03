"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendProactiveMessage } from "../lib/send-proactive-message"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function sendReceiptRequestAction(
  clientId: string,
  transactionIds: string[],
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId, status: "active" },
    })
    if (!link) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const org = await prisma.organization.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        whatsappPhone: true,
        userOrganizations: {
          where: { telegramChatId: { not: null } },
          select: { telegramChatId: true },
          take: 1,
        },
      },
    })
    if (!org) return errorResponse("Cliente no encontrado", "NOT_FOUND")
    const telegramChatId = org.userOrganizations[0]?.telegramChatId ?? null
    if (!telegramChatId && !org.whatsappPhone) {
      return errorResponse("El cliente no tiene canal vinculado", "VALIDATION_ERROR")
    }
    const orgChannel = { id: org.id, name: org.name, telegramChatId, whatsappPhone: org.whatsappPhone }

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        organizationId: clientId,
        transactionAttachments: { none: {} },
      },
      select: { id: true, name: true, merchantName: true, amount: true, date: true },
    })

    if (transactions.length === 0) {
      return errorResponse("No hay transacciones pendientes de comprobante", "VALIDATION_ERROR")
    }

    const context = {
      orgName: org.name,
      messageType: "receipt_request_list" as const,
      receiptRequest: {
        transactions: transactions.map((t) => ({
          date: t.date,
          amount: t.amount,
          name: t.merchantName ?? t.name ?? "—",
        })),
      },
    }

    const content = await generateProactiveMessage(context)
    const sent = await sendProactiveMessage(orgChannel, "receipt_request_list", content, context)

    if (!sent) {
      return errorResponse(
        "No se pudo enviar el mensaje (límite de 24h o sin canal configurado)",
        "VALIDATION_ERROR"
      )
    }

    return successResponse(undefined)
  } catch (error) {
    console.error("sendReceiptRequest error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al enviar la solicitud",
      "ERROR"
    )
  }
}
