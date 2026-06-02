"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import { PaperPlaneTilt } from "@phosphor-icons/react"
import { sendReminderAction } from "../actions/send-reminder"
import { toast } from "@polso/ui/sonner"

export function SendReminderButton({
  clientId,
  lastContactedAt,
  compact = false,
}: {
  clientId: string
  lastContactedAt: string | null
  compact?: boolean
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

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSend() }}
        disabled={loading || isWithin24h}
        title={isWithin24h ? "Ya se envió en las últimas 24h" : "Enviar recordatorio"}
        className="h-7 w-7 shrink-0"
      >
        <PaperPlaneTilt className="h-3.5 w-3.5" />
      </Button>
    )
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
