import { getAgentConnections } from "@/features/settings/queries/get-agent-connections"
import { AgentConnectionsCard } from "@/features/settings/components/agent-connections-card"

export default async function AgentSettingsPage() {
  const { whatsappPhone, telegramChatId } = await getAgentConnections()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Agente de Recibos</h1>
        <p className="text-muted-foreground">
          Gestiona los canales de mensajería conectados a tu cuenta
        </p>
      </div>

      <AgentConnectionsCard
        whatsappPhone={whatsappPhone}
        telegramChatId={telegramChatId}
      />
    </div>
  )
}
