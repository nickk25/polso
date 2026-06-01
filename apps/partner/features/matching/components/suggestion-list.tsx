"use client"

import { useState } from "react"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Card, CardContent } from "@polso/ui/card"
import { Checkbox } from "@polso/ui/checkbox"
import { Eye, CheckCircle } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { SuggestionActions } from "@/components/matching/suggestion-actions"
import { bulkConfirmSuggestionsAction } from "../actions/bulk-confirm-suggestions"
import type { MatchSuggestionWithDetails } from "../queries/get-match-suggestions"

const matchTypeLabel: Record<string, string> = {
  auto_matched: "Match automático",
  high_confidence: "Alta confianza",
  suggested: "Sugerido",
}

const matchTypeBadge: Record<string, "default" | "secondary" | "outline"> = {
  auto_matched: "default",
  high_confidence: "secondary",
  suggested: "outline",
}

interface SuggestionListProps {
  suggestions: MatchSuggestionWithDetails[]
  clientId: string
}

export function SuggestionList({ suggestions, clientId }: SuggestionListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllAutoMatched() {
    const autoIds = suggestions
      .filter((s) => s.matchType === "auto_matched")
      .map((s) => s.id)
    setSelected(new Set(autoIds))
  }

  async function handleBulkConfirm() {
    if (selected.size === 0) return
    setBulkLoading(true)
    const result = await bulkConfirmSuggestionsAction(clientId, Array.from(selected))
    setBulkLoading(false)
    if (result.success) {
      toast.success(`${result.data.confirmed} match${result.data.confirmed !== 1 ? "es" : ""} confirmado${result.data.confirmed !== 1 ? "s" : ""}`)
      setSelected(new Set())
    } else {
      toast.error(result.error ?? "Error al confirmar")
    }
  }

  const autoMatchedCount = suggestions.filter((s) => s.matchType === "auto_matched").length

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {autoMatchedCount > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllAutoMatched}>
            Seleccionar auto-matched ({autoMatchedCount})
          </Button>
        )}
        {selected.size > 0 && (
          <Button size="sm" onClick={handleBulkConfirm} disabled={bulkLoading}>
            <CheckCircle className="mr-1.5 h-4 w-4" />
            {bulkLoading ? "Confirmando…" : `Confirmar seleccionados (${selected.size})`}
          </Button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar selección
          </button>
        )}
      </div>

      {suggestions.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Checkbox */}
            <div className="flex items-start pt-0.5">
              <Checkbox
                checked={selected.has(s.id)}
                onCheckedChange={() => toggleOne(s.id)}
              />
            </div>

            {/* Transaction side */}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Transacción bancaria
              </p>
              <p className="text-sm font-medium">
                {s.transaction.merchantName ?? s.transaction.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.transaction.date.toLocaleDateString("es-ES")}
                {" · "}
                {s.transaction.amount.toLocaleString("es-ES", {
                  style: "currency",
                  currency: s.transaction.currency,
                })}
              </p>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-1">
              <Badge variant={matchTypeBadge[s.matchType] ?? "outline"}>
                {matchTypeLabel[s.matchType] ?? s.matchType}
              </Badge>
              <p className="text-lg font-bold">
                {Math.round(s.confidenceScore * 100)}%
              </p>
            </div>

            {/* Inbox side */}
            <div className="flex-1 text-right sm:text-left">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Comprobante
              </p>
              <p className="text-sm font-medium">
                {s.inboxItem.displayName ?? s.inboxItem.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.inboxItem.date?.toLocaleDateString("es-ES") ?? "—"}
                {s.inboxItem.amount !== null && (
                  <>
                    {" · "}
                    {Number(s.inboxItem.amount).toLocaleString("es-ES", {
                      style: "currency",
                      currency: s.inboxItem.currency,
                    })}
                  </>
                )}
                {s.inboxItem.taxRate !== null && (
                  <>
                    {" · "}IVA {Math.round((s.inboxItem.taxRate as number) * 100)}%
                    {s.inboxItem.taxAmount !== null && (
                      <>
                        {" "}
                        {Number(s.inboxItem.taxAmount).toLocaleString("es-ES", {
                          style: "currency",
                          currency: s.inboxItem.currency,
                        })}
                      </>
                    )}
                  </>
                )}
              </p>
              <a
                href={`/api/inbox/${s.inboxItem.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Eye className="h-3 w-3" />
                Ver factura
              </a>
            </div>

            {/* Actions */}
            <SuggestionActions suggestionId={s.id} clientId={clientId} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
