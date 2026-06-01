import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getClientInbox } from "@/features/inbox/queries/get-client-inbox"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { ArrowLeft, FileText, DownloadSimple } from "@phosphor-icons/react/dist/ssr"
import { UploadInboxButton } from "@/components/inbox/upload-inbox-button"

const statusLabel: Record<string, string> = {
  new: "Nuevo",
  processing: "Procesando",
  analyzing: "Analizando",
  suggested_match: "Match sugerido",
  no_match: "Sin match",
  done: "Conciliado",
  archived: "Archivado",
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  done: "default",
  suggested_match: "secondary",
  new: "outline",
  no_match: "destructive",
}

export default async function ClientInboxPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()
  const { items, total } = await getClientInbox(ctx.organizationId, clientId)

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
        <UploadInboxButton clientId={clientId} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin documentos todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">
            El cliente puede subir comprobantes desde su app o enviarlos por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
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
                <a
                  href={`/api/inbox/${item.id}`}
                  download={item.fileName}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <DownloadSimple className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
