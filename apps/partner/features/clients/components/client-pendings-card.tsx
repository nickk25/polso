import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { CheckCircle, Receipt, Percent, Sparkle, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import type { ClientQuarterPendings } from "../queries/get-client-quarter-pendings"

interface Props {
  clientId: string
  pendings: ClientQuarterPendings
}

function fmt(amount: number) {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
}

export function ClientPendingsCard({ clientId, pendings }: Props) {
  const { quarter, daysToClose, ivaPending, receiptPending, suggestionsPending } = pendings
  const allClear = ivaPending.count === 0 && receiptPending.count === 0 && suggestionsPending === 0

  const daysColor =
    daysToClose <= 7
      ? "text-red-500"
      : daysToClose <= 14
        ? "text-amber-500"
        : "text-muted-foreground"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Pendiente para el cierre — Q{quarter}</CardTitle>
          <p className={`text-xs mt-0.5 ${daysColor}`}>Faltan {daysToClose} días</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {allClear ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-600 font-medium">Todo listo para el cierre del trimestre</p>
          </div>
        ) : (
          <div className="divide-y">
            {ivaPending.count > 0 && (
              <Link
                href={`/clients/${clientId}/transactions`}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <Percent className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sin IVA clasificado</p>
                  <p className="text-xs text-muted-foreground">
                    {ivaPending.count} {ivaPending.count === 1 ? "registro" : "registros"} · {fmt(ivaPending.amount)}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Link>
            )}

            {receiptPending.count > 0 && (
              <Link
                href={`/clients/${clientId}/transactions`}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <Receipt className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sin comprobante</p>
                  <p className="text-xs text-muted-foreground">
                    {receiptPending.count} {receiptPending.count === 1 ? "transacción" : "transacciones"} · {fmt(receiptPending.amount)}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Link>
            )}

            {suggestionsPending > 0 && (
              <Link
                href={`/clients/${clientId}/conciliation`}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <Sparkle className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sugerencias por confirmar</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestionsPending} {suggestionsPending === 1 ? "match" : "matches"} pendiente{suggestionsPending === 1 ? "" : "s"}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
