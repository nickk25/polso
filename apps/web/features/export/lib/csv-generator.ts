import { format } from "date-fns"
import { generateInvoiceFileName, escapeCsv } from "@polso/utils/export"

export { generateInvoiceFileName }

export interface ExpenseForCSV {
  date: Date
  amount: number
  currency: string
  description: string | null
  entryType: "fixed" | "variable" | null
  status: string
  counterparty: {
    name: string
  } | null
  category: {
    name: string
  } | null
  documents: { id: string }[]
}

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

export function generateCSV(expenses: ExpenseForCSV[], separator = ";"): string {
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

  // BOM for Excel UTF-8 recognition
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
