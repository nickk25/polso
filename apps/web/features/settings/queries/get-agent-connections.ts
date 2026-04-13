import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface AgentConnections {
  whatsappPhone: string | null
  telegramChatId: string | null
}

export async function getAgentConnections(): Promise<AgentConnections> {
  const { organizationId } = await getAuthContext()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsappPhone: true, telegramChatId: true },
  })
  return {
    whatsappPhone: org?.whatsappPhone ?? null,
    telegramChatId: org?.telegramChatId ?? null,
  }
}
