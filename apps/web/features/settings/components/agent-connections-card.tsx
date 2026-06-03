"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Separator } from "@polso/ui/separator"
import { SpinnerGap, CheckCircle, Warning } from "@phosphor-icons/react"
import { generateAgentLinkCodeAction } from "../actions/generate-agent-link"

interface AgentConnectionsCardProps {
  whatsappPhone: string | null
  telegramChatId: string | null
}

export function AgentConnectionsCard({
  whatsappPhone,
  telegramChatId,
}: AgentConnectionsCardProps) {
  const router = useRouter()
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tick = useCallback(() => {
    if (!expiresAt) return
    const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    setSecondsLeft(left)
    if (left === 0) {
      setCode(null)
      setExpiresAt(null)
    }
  }, [expiresAt])

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, tick])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generateAgentLinkCodeAction()
    setLoading(false)
    if (result.success) {
      setCode(result.data.code)
      setExpiresAt(new Date(result.data.expiresAt))
      setSecondsLeft(300)
    } else {
      setError(result.error)
    }
  }

  function handleRefreshConnections() {
    router.refresh()
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, "0")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agente de Recibos</CardTitle>
        <CardDescription>
          Conecta Telegram para enviar recibos y facturas directamente desde tu móvil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WhatsApp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">WhatsApp</span>
            <Badge variant="secondary">Próximamente</Badge>
          </div>
        </div>

        {/* Telegram */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Telegram</span>
            {telegramChatId ? (
              <Badge variant="default">
                <CheckCircle className="mr-1 h-3 w-3" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline">Sin conectar</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Code section */}
        {code ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Paso 1 — Copia tu código</p>
              <div className="flex items-center gap-4">
                <span className="font-mono text-3xl font-bold tracking-[0.3em]">{code}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{minutes}:{seconds}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Paso 2 — Abre el bot y envíale el código</p>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="https://t.me/PolsoAgentBot" target="_blank" rel="noopener noreferrer">
                    Abrir @PolsoAgentBot
                  </a>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRefreshConnections}>
                  Actualizar estado
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Cómo conectar Telegram</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Genera un código de conexión</li>
                <li>Abre <a href="https://t.me/PolsoAgentBot" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">@PolsoAgentBot</a> en Telegram</li>
                <li>Envíale el código — quedará vinculado a tu cuenta</li>
              </ol>
            </div>
            <Button onClick={handleGenerate} disabled={loading} variant="outline">
              {loading && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
              Generar código de conexión
            </Button>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1 text-sm text-destructive">
            <Warning className="h-4 w-4" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
