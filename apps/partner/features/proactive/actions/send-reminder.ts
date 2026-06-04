"use server"

import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { sendReminderInternal } from "../lib/send-reminder-internal"

export async function sendReminderAction(clientId: string): Promise<{
  success: boolean
  error?: string
  code?: string
}> {
  const ctx = await getPartnerAuthContext()

  const link = await prisma.partnerClient.findFirst({
    where: { partnerId: ctx.organizationId, clientId, status: "active" },
  })
  if (!link) return { success: false, error: "Cliente no encontrado", code: "FORBIDDEN" }

  const partner = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { autoRemindersEnabled: true, reminderCooldownHours: true },
  })

  if (!partner?.autoRemindersEnabled) {
    return { success: false, error: "Los recordatorios automáticos están desactivados", code: "REMINDERS_DISABLED" }
  }

  const cooldownMs = (partner.reminderCooldownHours ?? 24) * 60 * 60 * 1000
  const lastMessage = await prisma.proactiveMessage.findFirst({
    where: { organizationId: clientId, messageType: "receipt_reminder" },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  })

  if (lastMessage && Date.now() - lastMessage.sentAt.getTime() < cooldownMs) {
    const hours = partner.reminderCooldownHours ?? 24
    return {
      success: false,
      error: `Ya se envió un recordatorio en las últimas ${hours}h`,
      code: "RATE_LIMITED",
    }
  }

  return sendReminderInternal(clientId)
}
