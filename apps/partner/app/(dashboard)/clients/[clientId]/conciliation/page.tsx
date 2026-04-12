import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getMatchSuggestions } from "@/features/matching/queries/get-match-suggestions"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Card, CardContent } from "@polso/ui/card"
import { ArrowLeft, CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr"
import { SuggestionActions } from "@/components/matching/suggestion-actions"
import { RunMatchingButton } from "@/components/matching/run-matching-button"

export default async function ConciliationPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()
  const suggestions = await getMatchSuggestions(ctx.organizationId, clientId)

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

  return (
    <div className="flex flex-col gap-6 p-6">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            {suggestions.length} sugerencia{suggestions.length !== 1 ? "s" : ""} pendiente{suggestions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <RunMatchingButton clientId={clientId} />
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
          <p className="text-sm font-medium">Todo conciliado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No hay sugerencias de match pendientes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
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
                  </p>
                </div>

                {/* Actions */}
                <SuggestionActions
                  suggestionId={s.id}
                  clientId={clientId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
