import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getClientInbox } from "@/features/inbox/queries/get-client-inbox"
import { getMatchSuggestions } from "@/features/matching/queries/get-match-suggestions"
import { SuggestionList } from "@/features/matching/components/suggestion-list"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { ArrowLeft, FileText, DownloadSimple, Sparkle, Eye } from "@phosphor-icons/react/dist/ssr"
import { UploadInboxButton } from "@/components/inbox/upload-inbox-button"
import { RunMatchingButton } from "@/components/matching/run-matching-button"

const statusLabel: Record<string, string> = {
  new: "Nuevo",
  processing: "Procesando",
  analyzing: "Analizando",
  suggested_match: "Match sugerido",
  no_match: "Sin match",
  ocr_failed: "Error de lectura",
  done: "Conciliado",
  archived: "Archivado",
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  done: "default",
  suggested_match: "secondary",
  new: "outline",
  no_match: "destructive",
  ocr_failed: "destructive",
}

export default async function ClientInboxPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()

  const [{ items, total }, suggestions] = await Promise.all([
    getClientInbox(ctx.organizationId, clientId),
    getMatchSuggestions(ctx.organizationId, clientId),
  ])

  const documents = items.filter((i) => i.status !== "suggested_match")
  const isEmpty = suggestions.length === 0 && documents.length === 0

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
          <span className="text-xs text-muted-foreground">{total} documentos</span>
        </div>
        <div className="flex items-center gap-2">
          <RunMatchingButton clientId={clientId} />
          <UploadInboxButton clientId={clientId} />
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin documentos todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">
            El cliente puede subir comprobantes desde su app o enviarlos por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Suggestions section */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkle className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold">Sugerencias de match</h2>
                <span className="text-xs text-muted-foreground">
                  {suggestions.length} por confirmar
                </span>
              </div>
              <SuggestionList suggestions={suggestions} clientId={clientId} />
            </div>
          )}

          {/* Documents section */}
          {documents.length > 0 && (
            <div className="flex flex-col gap-3">
              {suggestions.length > 0 && (
                <h2 className="text-sm font-semibold">Documentos</h2>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-md border p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium truncate">{item.displayName ?? item.fileName}</p>
                      <Badge
                        variant={statusVariant[item.status] ?? "outline"}
                        className="ml-2 shrink-0 text-xs"
                      >
                        {statusLabel[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {item.amount !== null && (
                        <span className="font-medium text-foreground">
                          {Number(item.amount).toLocaleString("es-ES", {
                            style: "currency",
                            currency: item.currency,
                          })}
                        </span>
                      )}
                      {item.taxRate !== null && (
                        <span>
                          IVA {Math.round(item.taxRate * 100)}%
                          {item.taxAmount !== null && (
                            <> · {Number(item.taxAmount).toLocaleString("es-ES", { style: "currency", currency: item.currency })}</>
                          )}
                        </span>
                      )}
                      {item.date && (
                        <span>{item.date.toLocaleDateString("es-ES")}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {item.source} · {item.createdAt.toLocaleDateString("es-ES")}
                      </p>
                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/inbox/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/api/inbox/${item.id}`}
                          download={item.fileName}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <DownloadSimple className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
