"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import { PaperPlaneTilt } from "@phosphor-icons/react"
import { sendReminderAction } from "../actions/send-reminder"
import { toast } from "sonner"

export function SendReminderButton({
  clientId,
  lastContactedAt,
}: {
  clientId: string
  lastContactedAt: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [lastSent, setLastSent] = useState(lastContactedAt)

  const isWithin24h = lastSent
    ? Date.now() - new Date(lastSent).getTime() < 24 * 60 * 60 * 1000
    : false

  async function handleSend() {
    setLoading(true)
    try {
      const result = await sendReminderAction(clientId)
      if (result.success) {
        toast.success("Recordatorio enviado")
        setLastSent(new Date().toISOString())
      } else {
        toast.error(result.error ?? "Error al enviar")
      }
    } catch {
      toast.error("Error al enviar el recordatorio")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lastSent && (
        <span className="text-xs text-muted-foreground">
          Último contacto:{" "}
          {new Date(lastSent).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={handleSend} disabled={loading || isWithin24h} title={isWithin24h ? "Ya se envió un recordatorio en las últimas 24h" : undefined}>
        <PaperPlaneTilt className="mr-1 h-4 w-4" />
        {loading ? "Enviando..." : "Enviar recordatorio"}
      </Button>
    </div>
  )
}
