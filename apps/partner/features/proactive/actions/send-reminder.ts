"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUnmatchedTransactions } from "../lib/gather-context"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendTelegramText } from "@polso/agent/telegram"
import { sendWhatsAppText } from "@polso/agent/whatsapp"
import type { ProactiveContext } from "@polso/agent/proactive"

type ReminderResult = { success: boolean; error?: string; code?: string }

export async function sendReminderInternal(
  clientId: string,
): Promise<ReminderResult> {
  const org = await prisma.organization.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, telegramChatId: true, whatsappPhone: true },
  })

  if (!org) return { success: false, error: "Cliente no encontrado", code: "not-found" }
  if (!org.telegramChatId && !org.whatsappPhone)
    return { success: false, error: "El cliente no tiene canal vinculado", code: "no-channel" }

  const unmatched = await getUnmatchedTransactions(clientId)
  if (unmatched.length === 0)
    return { success: false, error: "No hay transacciones sin comprobante", code: "no-unmatched" }

  const context: ProactiveContext = {
    orgName: org.name,
    messageType: "receipt_reminder",
    unmatchedTransactions: unmatched,
  }

  const content = await generateProactiveMessage(context)
  const channel = org.telegramChatId ? "telegram" : "whatsapp"

  try {
    if (channel === "telegram") {
      await sendTelegramText(org.telegramChatId!, content)
    } else {
      await sendWhatsAppText(org.whatsappPhone!, content)
    }
  } catch {
    return { success: false, error: "Error al enviar el mensaje", code: "send-error" }
  }

  await prisma.proactiveMessage.create({
    data: {
      organizationId: org.id,
      channel,
      messageType: "receipt_reminder",
      content,
      context: context as object,
    },
  })

  return { success: true }
}

export async function sendReminderAction(clientId: string): Promise<{
  success: boolean
  error?: string
}> {
  await getPartnerAuthContext()
  return sendReminderInternal(clientId)
}
