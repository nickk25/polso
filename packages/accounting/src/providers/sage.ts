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
  "NumeroAsiento",
  "Fecha",
  "Cuenta",
  "Contrapartida",
  "ImporteDebe",
  "ImporteHaber",
  "Concepto",
  "NumeroFactura",
  "ImporteBaseImponible",
  "P_IVA",
  "NIF",
  "Documento",
]

export const sageProvider: AccountingProvider = {
  id: "sage",
  name: "Sage 50",

  generate(lines: JournalLine[], { separator = "," }: { separator: string }): string {
    const rows: string[] = []

    // UTF-8 BOM + headers
    rows.push("﻿" + HEADERS.join(separator))

    for (const line of lines) {
      const row = [
        String(line.journalId),
        formatDate(line.date),
        escapeCsv(line.account, separator),
        escapeCsv(line.counterAccount, separator),
        formatAmount(line.debit),
        formatAmount(line.credit),
        escapeCsv(line.description, separator),
        escapeCsv(line.invoiceNumber ?? "", separator),
        line.taxBase != null ? formatAmount(line.taxBase) : "",
        line.taxRate != null ? String(Math.round(line.taxRate * 100)) : "",
        escapeCsv(line.counterpartyTaxId ?? "", separator),
        escapeCsv(line.documentRef, separator),
      ]
      rows.push(row.join(separator))
    }

    return rows.join("\r\n")
  },
}
