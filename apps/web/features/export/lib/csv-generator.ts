import { format } from "date-fns"
import { generateInvoiceFileName, escapeCsv } from "@polso/utils/export"
import {
  convertToJournalLines,
  a3Provider,
  sageProvider,
  type MappedTransaction,
} from "@polso/accounting"
import type { EntryForExport } from "../queries/get-exports"

export { generateInvoiceFileName }

export type ExportFormat = "standard" | "a3" | "sage"

const CSV_HEADERS = [
  "Fecha",
  "Proveedor",
  "Descripcion",
  "Categoria",
  "Tipo",
  "Importe",
  "Moneda",
  "Documentado",
]

function formatSpanishNumber(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function toMappedTransaction(expense: EntryForExport): MappedTransaction {
  return {
    id: expense.id,
    amount: expense.amount,
    direction: "expense",
    currency: expense.currency,
    date: new Date(expense.date),
    description: expense.description ?? "",
    counterpartyName: expense.counterparty?.name ?? null,
    counterpartyTaxId: expense.counterparty?.taxId ?? null,
    categoryAccountCode: expense.category?.accountCode ?? null,
    taxRate: expense.taxRate ?? null,
    taxAmount: expense.taxAmount ?? null,
    documentRef: expense.documents[0]?.id ?? null,
  }
}

export function generateCSV(
  expenses: EntryForExport[],
  separator = ";",
  exportFormat: ExportFormat = "standard"
): string {
  if (exportFormat === "a3") {
    const mapped = expenses.map(toMappedTransaction)
    const lines = convertToJournalLines(mapped)
    return a3Provider.generate(lines, { separator })
  }

  if (exportFormat === "sage") {
    const mapped = expenses.map(toMappedTransaction)
    const lines = convertToJournalLines(mapped)
    return sageProvider.generate(lines, { separator: "," })
  }

  // Standard format
  const rows: string[] = []
  rows.push(CSV_HEADERS.join(separator))

  for (const expense of expenses) {
    const row = [
      format(new Date(expense.date), "dd/MM/yyyy"),
      escapeCsv(expense.counterparty?.name || "Sin proveedor", separator),
      escapeCsv(expense.description || "", separator),
      escapeCsv(expense.category?.name || "Sin categoria", separator),
      expense.entryType === "fixed" ? "Fijo" : "Variable",
      formatSpanishNumber(expense.amount),
      expense.currency,
      expense.documents.length > 0 ? "Si" : "No",
    ]
    rows.push(row.join(separator))
  }

  return "﻿" + rows.join("\n")
}

export function generateExportFileName(
  startDate: Date,
  endDate: Date,
  type: "csv" | "pdf" | "zip"
): string {
  const start = format(startDate, "yyyy-MM-dd")
  const end = format(endDate, "yyyy-MM-dd")
  return `polso-export-${start}_${end}.${type}`
}
