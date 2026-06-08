import { escapeCsv } from "@polso/utils/export"
import { AccountingProvider, JournalLine } from "../types"

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function formatAmount(n: number): string {
  return n.toFixed(2)
}

const HEADERS = [
  "FECHA",
  "ID_ASIENTO",
  "CUENTA",
  "CONTRAPARTIDA",
  "DEBE",
  "HABER",
  "CONCEPTO",
  "DOCUMENTO",
  "NIF",
  "BASE",
  "P_IVA",
  "CUOTA_IVA",
]

export const a3Provider: AccountingProvider = {
  id: "a3",
  name: "A3con",

  generate(lines: JournalLine[], { separator = ";" }: { separator: string }): string {
    const rows: string[] = []

    // UTF-8 BOM + headers
    rows.push("﻿" + HEADERS.join(separator))

    for (const line of lines) {
      const row = [
        formatDate(line.date),
        String(line.journalId),
        escapeCsv(line.account, separator),
        escapeCsv(line.counterAccount, separator),
        formatAmount(line.debit),
        formatAmount(line.credit),
        escapeCsv(line.description, separator),
        escapeCsv(line.documentRef, separator),
        escapeCsv(line.counterpartyTaxId ?? "", separator),
        line.taxBase != null ? formatAmount(line.taxBase) : "",
        line.taxRate != null ? String(Math.round(line.taxRate * 100)) : "",
        line.taxAmount != null ? formatAmount(line.taxAmount) : "",
      ]
      rows.push(row.join(separator))
    }

    return rows.join("\r\n")
  },
}
