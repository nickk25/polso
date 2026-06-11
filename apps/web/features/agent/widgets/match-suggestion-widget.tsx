"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Receipt, Spinner } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { confirmMatchAction, rejectMatchAction } from "@/features/inbox/actions/vault-actions"
import type { MatchSuggestionResult } from "./registry"

interface MatchSuggestionWidgetProps {
  data: MatchSuggestionResult
}

function confidenceBadgeVariant(confidence: number): "default" | "secondary" | "outline" | "destructive" {
  if (confidence >= 0.75) return "default"
  return "secondary"
}

export function MatchSuggestionWidget({ data }: MatchSuggestionWidgetProps) {
  const { suggestionId, transactionName, amount, currency, date, confidence } = data

  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await confirmMatchAction(suggestionId)
      if (result.success) {
        setConfirmed(true)
      } else {
        setError(result.error ?? "Error al confirmar el emparejamiento.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await rejectMatchAction(suggestionId)
      if (result.success) {
        setDeclined(true)
      } else {
        setError(result.error ?? "Error al rechazar el emparejamiento.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Transacción coincidente
            </p>
          </div>
          <Badge variant={confidenceBadgeVariant(confidence)}>
            {Math.round(confidence * 100)}% confianza
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{transactionName}</span>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(amount)}</span>
            <span>{formatDate(date)}</span>
          </div>
        </div>

        {confirmed && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>Emparejado correctamente</span>
          </div>
        )}

        {declined && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Rechazado</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {!confirmed && !declined && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? <Spinner className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={handleDecline}
            >
              Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
