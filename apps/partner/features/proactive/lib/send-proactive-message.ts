import { prisma } from "@/lib/db"
import { sendTelegramText } from "@polso/agent/telegram"
import { sendWhatsAppText } from "@polso/agent/whatsapp"
import type { MessageType, ProactiveContext } from "@polso/agent/proactive"

interface OrgChannel {
  id: string
  whatsappPhone: string | null
  telegramChatId: string | null
}

/**
 * Resolves the channel for an org, enforces the 24h rate limit, sends the message,
 * and logs it to the ProactiveMessage table.
 *
 * Returns true if the message was sent, false if skipped (rate limit, no channel).
 */
export async function sendProactiveMessage(
  org: OrgChannel,
  messageType: MessageType,
  content: string,
  context: ProactiveContext
): Promise<boolean> {
  // Global rate limit: max 1 message per org per 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentMessage = await prisma.proactiveMessage.findFirst({
    where: { organizationId: org.id, sentAt: { gte: since } },
    select: { id: true },
  })
  if (recentMessage) return false

  // Channel resolution: prefer Telegram (no 24h session window restriction)
  let channel: "telegram" | "whatsapp"
  if (org.telegramChatId) {
    channel = "telegram"
  } else if (org.whatsappPhone) {
    channel = "whatsapp"
  } else {
    return false
  }

  try {
    if (channel === "telegram") {
      await sendTelegramText(org.telegramChatId!, content)
    } else {
      await sendWhatsAppText(org.whatsappPhone!, content)
    }
  } catch (err) {
    console.error(`[proactive] send failed for org ${org.id} via ${channel}:`, err)
    return false
  }

  // Log after successful send
  await prisma.proactiveMessage.create({
    data: {
      organizationId: org.id,
      channel,
      messageType,
      content,
      context: context as object,
    },
  })

  return true
}
