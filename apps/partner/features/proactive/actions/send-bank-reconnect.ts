"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendProactiveMessage } from "../lib/send-proactive-message"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

export async function sendBankReconnectAction(
  clientId: string,
  accountId: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getPartnerAuthContext()
    if (ctx.orgType !== "partner") return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId, status: "active" },
    })
    if (!link) return errorResponse("Acceso no autorizado", "FORBIDDEN")

    const [org, account] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, telegramChatId: true, whatsappPhone: true },
      }),
      prisma.account.findFirst({
        where: { id: accountId, organizationId: clientId },
        select: { institutionName: true, requisitionExpiresAt: true, syncError: true },
      }),
    ])

    if (!org) return errorResponse("Cliente no encontrado", "NOT_FOUND")
    if (!account) return errorResponse("Cuenta no encontrada", "NOT_FOUND")
    if (!org.telegramChatId && !org.whatsappPhone) {
      return errorResponse("El cliente no tiene canal vinculado", "VALIDATION_ERROR")
    }

    const context = {
      orgName: org.name,
      messageType: "bank_reconnect" as const,
      bankReconnect: {
        institutionName: account.institutionName ?? "tu banco",
        expiresAt: account.requisitionExpiresAt,
        errorMessage: account.syncError,
      },
    }

    const content = await generateProactiveMessage(context)
    const sent = await sendProactiveMessage(org, "bank_reconnect", content, context)

    if (!sent) {
      return errorResponse(
        "No se pudo enviar el mensaje (límite de 24h o sin canal configurado)",
        "VALIDATION_ERROR"
      )
    }

    return successResponse(undefined)
  } catch (error) {
    console.error("sendBankReconnect error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error al enviar el mensaje",
      "ERROR"
    )
  }
}
