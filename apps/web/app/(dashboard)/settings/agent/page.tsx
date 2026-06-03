import { getAgentConnections } from "@/features/settings/queries/get-agent-connections"
import { AgentConnectionsCard } from "@/features/settings/components/agent-connections-card"

export default async function AgentSettingsPage() {
  const { whatsappPhone, telegramChatId } = await getAgentConnections()

  return (
    <div className="flex flex-col gap-6 p-6">
      <AgentConnectionsCard
        whatsappPhone={whatsappPhone}
        telegramChatId={telegramChatId}
      />
    </div>
  )

}
