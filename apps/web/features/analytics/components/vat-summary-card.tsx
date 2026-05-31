"use client"

import { useTranslations } from "next-intl"
import { CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { formatCurrency } from "@/lib/format-currency"
import type { VATSummary } from "@/features/analytics/queries/get-analytics"

interface VATSummaryCardProps {
  data: VATSummary
}

export function VATSummaryCard({ data }: VATSummaryCardProps) {
  const t = useTranslations("analytics.vat")

  const isEmpty = data.ytdCollected === 0 && data.ytdPaid === 0

  const rows = [
    { label: t("collected"), values: data.quarters.map((q) => q.collected), total: data.ytdCollected, color: "text-green-600 dark:text-green-400" },
    { label: t("paid"), values: data.quarters.map((q) => q.paid), total: data.ytdPaid, color: "text-red-500" },
    { label: t("net"), values: data.quarters.map((q) => q.net), total: data.ytdNet, color: "", bold: true },
  ]

  return (
    <>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed">
            <p className="text-sm font-medium text-muted-foreground">{t("empty")}</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-28"></th>
                  {data.quarters.map((q) => (
                    <th
                      key={q.quarter}
                      className={`text-right py-2 px-3 font-medium ${q.quarter === data.currentQuarter.quarter ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {t("q", { quarter: q.quarter })}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-3 font-medium">{t("ytd")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i < rows.length - 1 ? "border-b" : ""}>
                    <td className={`py-2.5 pr-4 text-muted-foreground ${row.bold ? "font-semibold text-foreground" : ""}`}>
                      {row.label}
                    </td>
                    {row.values.map((val, qi) => {
                      const isCurrent = data.quarters[qi].quarter === data.currentQuarter.quarter
                      const colorClass = row.bold
                        ? val >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                        : row.color
                      return (
                        <td
                          key={qi}
                          className={`text-right py-2.5 px-3 ${colorClass} ${row.bold ? "font-semibold" : ""} ${isCurrent ? "bg-muted/40 rounded" : ""}`}
                        >
                          {val > 0 || row.bold
                            ? (row.bold && val >= 0 ? "+" : "") + formatCurrency(Math.abs(val), data.currency)
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      )
                    })}
                    <td className={`text-right py-2.5 pl-3 font-medium ${row.bold ? "font-bold " + (row.total >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500") : row.color}`}>
                      {row.bold
                        ? (row.total >= 0 ? "+" : "") + formatCurrency(Math.abs(row.total), data.currency)
                        : formatCurrency(row.total, data.currency)}
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
