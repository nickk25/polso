"use server"

import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUnmatchedTransactions } from "../lib/gather-context"
import { generateProactiveMessage } from "@polso/agent/proactive"
import { sendTelegramText } from "@polso/agent/telegram"
import { sendWhatsAppText } from "@polso/agent/whatsapp"
import type { ProactiveContext } from "@polso/agent/proactive"

export async function sendReminderAction(clientId: string): Promise<{
  success: boolean
  error?: string
}> {
  console.log("[send-reminder] starting for client:", clientId)

  await getPartnerAuthContext()

  const org = await prisma.organization.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, telegramChatId: true, whatsappPhone: true },
  })

  console.log("[send-reminder] org:", org?.name, "telegram:", org?.telegramChatId, "whatsapp:", org?.whatsappPhone)

  if (!org) return { success: false, error: "Cliente no encontrado" }
  if (!org.telegramChatId && !org.whatsappPhone)
    return { success: false, error: "El cliente no tiene canal vinculado" }

  const unmatched = await getUnmatchedTransactions(clientId)
  console.log("[send-reminder] unmatched transactions:", unmatched.length)

  if (unmatched.length === 0)
    return { success: false, error: "No hay transacciones sin comprobante" }

  const context: ProactiveContext = {
    orgName: org.name,
    messageType: "receipt_reminder",
    unmatchedTransactions: unmatched,
  }

  console.log("[send-reminder] generating message...")
  const content = await generateProactiveMessage(context)
  console.log("[send-reminder] message generated:", content.slice(0, 80))

  const channel = org.telegramChatId ? "telegram" : "whatsapp"
  console.log("[send-reminder] sending via:", channel)

  try {
    if (channel === "telegram") {
      await sendTelegramText(org.telegramChatId!, content)
    } else {
      await sendWhatsAppText(org.whatsappPhone!, content)
    }
  } catch (err) {
    console.error("[send-reminder] send failed:", err)
    return { success: false, error: "Error al enviar el mensaje" }
  }

  console.log("[send-reminder] message sent, logging to DB")
  await prisma.proactiveMessage.create({
    data: {
      organizationId: org.id,
      channel,
      messageType: "receipt_reminder",
      content,
      context: context as object,
    },
  })

  console.log("[send-reminder] done")
  return { success: true }
}
