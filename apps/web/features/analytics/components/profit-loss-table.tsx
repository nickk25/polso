"use client"

import { useTranslations } from "next-intl"
import { formatCurrency } from "@/lib/format-currency"
import type { CashFlowData } from "../queries/get-analytics"

interface ProfitLossTableProps {
  data: CashFlowData[]
  currency: string
}

export function ProfitLossTable({ data, currency }: ProfitLossTableProps) {
  const t = useTranslations("analytics")

  const totalRevenue = data.reduce((sum, d) => sum + d.inflow, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.outflow, 0)
  const totalNet = totalRevenue - totalExpenses

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-36">{t("pl.row")}</th>
            {data.map((d) => (
              <th key={d.month} className="text-right py-2 px-3 font-medium text-muted-foreground">
                {d.month}
              </th>
            ))}
            <th className="text-right py-2 pl-3 font-medium">{t("pl.total")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2.5 pr-4 text-muted-foreground">{t("pl.revenue")}</td>
            {data.map((d) => (
              <td key={d.month} className="text-right py-2.5 px-3 text-green-600 dark:text-green-400">
                {d.inflow > 0 ? formatCurrency(d.inflow, currency) : <span className="text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="text-right py-2.5 pl-3 font-medium text-green-600 dark:text-green-400">
              {formatCurrency(totalRevenue, currency)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2.5 pr-4 text-muted-foreground">{t("pl.expenses")}</td>
            {data.map((d) => (
              <td key={d.month} className="text-right py-2.5 px-3 text-red-500">
                {d.outflow > 0 ? formatCurrency(d.outflow, currency) : <span className="text-muted-foreground">—</span>}
              </td>
            ))}
            <td className="text-right py-2.5 pl-3 font-medium text-red-500">
              {formatCurrency(totalExpenses, currency)}
            </td>
          </tr>
          <tr>
            <td className="pt-3 pb-1 pr-4 font-semibold">{t("pl.netProfit")}</td>
            {data.map((d) => (
              <td
                key={d.month}
                className={`text-right pt-3 pb-1 px-3 font-semibold ${d.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
              >
                {d.net >= 0 ? "+" : ""}
                {formatCurrency(d.net, currency)}
              </td>
            ))}
            <td className={`text-right pt-3 pb-1 pl-3 font-bold ${totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              {totalNet >= 0 ? "+" : ""}
              {formatCurrency(totalNet, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
