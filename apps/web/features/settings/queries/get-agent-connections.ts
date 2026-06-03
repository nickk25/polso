import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface AgentConnections {
  whatsappPhone: string | null
  telegramChatId: string | null
}

export async function getAgentConnections(): Promise<AgentConnections> {
  const { organizationId, userId } = await getAuthContext()
  const [org, membership] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappPhone: true },
    }),
    prisma.userOrganization.findFirst({
      where: { userId, organizationId },
      select: { telegramChatId: true },
    }),
  ])
  return {
    whatsappPhone: org?.whatsappPhone ?? null,
    telegramChatId: membership?.telegramChatId ?? null,
  }
}
