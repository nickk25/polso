import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getMatchSuggestions } from "@/features/matching/queries/get-match-suggestions"
import { Button } from "@polso/ui/button"
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react/dist/ssr"
import { RunMatchingButton } from "@/components/matching/run-matching-button"
import { SuggestionList } from "@/features/matching/components/suggestion-list"

export default async function ConciliationPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()
  const suggestions = await getMatchSuggestions(ctx.organizationId, clientId)

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
        <SuggestionList suggestions={suggestions} clientId={clientId} />
      )}
    </div>
  )
}
