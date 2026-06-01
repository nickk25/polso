import { CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import type { ClientVATSummary } from "../queries/get-client-vat-summary"

interface ClientVatCardProps {
  data: ClientVATSummary
}

function fmt(amount: number, currency: string) {
  return Math.abs(amount).toLocaleString("es-ES", { style: "currency", currency, maximumFractionDigits: 0 })
}

export function ClientVatCard({ data }: ClientVatCardProps) {
  const isEmpty = data.ytdCollected === 0 && data.ytdPaid === 0

  const rows = [
    { label: "IVA cobrado", values: data.quarters.map((q) => q.collected), total: data.ytdCollected, color: "text-green-600" },
    { label: "IVA soportado", values: data.quarters.map((q) => q.paid), total: data.ytdPaid, color: "text-red-500" },
    { label: "Neto a declarar", values: data.quarters.map((q) => q.net), total: data.ytdNet, color: "", bold: true },
  ]

  return (
    <>
      <CardHeader>
        <CardTitle>Resumen IVA {data.year}</CardTitle>
        <p className="text-sm text-muted-foreground">Modelo 303 — desglose trimestral</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed">
            <p className="text-sm font-medium text-muted-foreground">Sin datos de IVA este año</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              El IVA se extrae automáticamente de los comprobantes OCR o se puede editar en cada transacción.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-32" />
                  {data.quarters.map((q) => (
                    <th
                      key={q.quarter}
                      className={`text-right py-2 px-3 font-medium ${
                        q.quarter === data.currentQuarter.quarter ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      T{q.quarter}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-3 font-medium">Acum.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i < rows.length - 1 ? "border-b" : ""}>
                    <td className={`py-2.5 pr-4 ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {row.label}
                    </td>
                    {row.values.map((val, qi) => {
                      const isCurrent = data.quarters[qi].quarter === data.currentQuarter.quarter
                      const colorClass = row.bold
                        ? val >= 0 ? "text-green-600" : "text-red-500"
                        : row.color
                      return (
                        <td
                          key={qi}
                          className={`text-right py-2.5 px-3 tabular-nums ${colorClass} ${row.bold ? "font-semibold" : ""} ${isCurrent ? "bg-muted/40 rounded" : ""}`}
                        >
                          {val !== 0 || row.bold
                            ? (row.bold && val >= 0 ? "+" : "") + fmt(val, data.currency)
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      )
                    })}
                    <td className={`text-right py-2.5 pl-3 font-medium tabular-nums ${
                      row.bold
                        ? "font-bold " + (row.total >= 0 ? "text-green-600" : "text-red-500")
                        : row.color
                    }`}>
                      {row.bold
                        ? (row.total >= 0 ? "+" : "") + fmt(row.total, data.currency)
                        : fmt(row.total, data.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </>
  )
}
