"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@polso/ui/button"
import { CheckCircle, XCircle } from "@phosphor-icons/react"
import { confirmSuggestionAction, declineSuggestionAction } from "@/features/matching/actions/handle-suggestion"

export function SuggestionActions({
  suggestionId,
  clientId,
}: {
  suggestionId: string
  clientId: string
}) {
  const [loading, setLoading] = useState<"confirm" | "decline" | null>(null)

  async function handleConfirm() {
    setLoading("confirm")
    const result = await confirmSuggestionAction(suggestionId, clientId)
    setLoading(null)
    if (result.success) {
      toast.success("Match confirmado")
    } else {
      toast.error(result.error ?? "Error al confirmar")
    }
  }

  async function handleDecline() {
    setLoading("decline")
    const result = await declineSuggestionAction(suggestionId, clientId)
    setLoading(null)
    if (result.success) {
      toast.success("Sugerencia rechazada")
    } else {
      toast.error(result.error ?? "Error al rechazar")
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDecline}
        disabled={loading !== null}
      >
        <XCircle className="h-4 w-4 text-red-500" />
      </Button>
      <Button
        size="sm"
        onClick={handleConfirm}
        disabled={loading !== null}
      >
        <CheckCircle className="mr-1 h-4 w-4" />
        Confirmar
      </Button>
    </div>
  )
}
