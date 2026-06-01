"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import { ArrowClockwise } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { sendBankReconnectAction } from "@/features/proactive/actions/send-bank-reconnect"

interface BankReconnectButtonProps {
  clientId: string
  accountId: string
  disabledByRateLimit: boolean
}

export function BankReconnectButton({ clientId, accountId, disabledByRateLimit }: BankReconnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const result = await sendBankReconnectAction(clientId, accountId)
    setLoading(false)
    if (result.success) {
      toast.success("Mensaje enviado al cliente")
    } else {
      toast.error(result.error ?? "Error al enviar el mensaje")
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || disabledByRateLimit}
      title={disabledByRateLimit ? "Ya se envió un mensaje en las últimas 24h" : undefined}
    >
      <ArrowClockwise className="mr-1.5 h-3.5 w-3.5" />
      {loading ? "Enviando…" : "Pedir reconectar"}
    </Button>
  )
}
