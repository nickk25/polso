"use client"

import type { ClientPLPoint } from "../queries/get-client-profit-loss"

interface ClientPLTableProps {
  data: ClientPLPoint[]
  currency: string
}

function fmt(amount: number, currency: string) {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
}

export function ClientPLTable({ data, currency }: ClientPLTableProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.inflow, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.outflow, 0)
  const totalNet = totalRevenue - totalExpenses

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-36">Concepto</th>
            {data.map((d) => (
              <th key={d.month} className="text-right py-2 px-3 font-medium text-muted-foreground">
                {d.month}
              </th>
            ))}
            <th className="text-right py-2 pl-3 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2.5 pr-4 text-muted-foreground">Ingresos</td>
            {data.map((d) => (
              <td key={d.month} className="text-right py-2.5 px-3 text-green-600">
                {d.inflow > 0 ? fmt(d.inflow, currency) : <span className="text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="text-right py-2.5 pl-3 font-medium text-green-600">
              {fmt(totalRevenue, currency)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2.5 pr-4 text-muted-foreground">Gastos</td>
            {data.map((d) => (
              <td key={d.month} className="text-right py-2.5 px-3 text-red-500">
                {d.outflow > 0 ? fmt(d.outflow, currency) : <span className="text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="text-right py-2.5 pl-3 font-medium text-red-500">
              {fmt(totalExpenses, currency)}
            </td>
          </tr>
          <tr>
            <td className="pt-3 pb-1 pr-4 font-semibold">Beneficio neto</td>
            {data.map((d) => (
              <td
                key={d.month}
                className={`text-right pt-3 pb-1 px-3 font-semibold ${d.net >= 0 ? "text-green-600" : "text-red-500"}`}
              >
                {d.net >= 0 ? "+" : ""}{fmt(d.net, currency)}
              </td>
            ))}
            <td className={`text-right pt-3 pb-1 pl-3 font-bold ${totalNet >= 0 ? "text-green-600" : "text-red-500"}`}>
              {totalNet >= 0 ? "+" : ""}{fmt(totalNet, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
