import { format } from "date-fns"

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

function escapeCSVField(value: string, separator: string): string {
  if (value.includes(separator) || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatSpanishNumber(value: number): string {
  // Spanish format: comma as decimal separator, dot as thousands
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
      escapeCSVField(expense.counterparty?.name || "Sin proveedor", separator),
      escapeCSVField(expense.description || "", separator),
      escapeCSVField(expense.category?.name || "Sin categoria", separator),
      expense.entryType === "fixed" ? "Fijo" : "Variable",
      formatSpanishNumber(expense.amount),
      expense.currency,
      expense.documents.length > 0 ? "Si" : "No",
    ]
    rows.push(row.join(separator))
  }

  // BOM for Excel UTF-8 recognition
  return "\uFEFF" + rows.join("\n")
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

export function generateInvoiceFileName(
  date: Date,
  vendorName: string | null,
  amount: number,
  originalExtension: string
): string {
  const dateStr = format(date, "yyyy-MM-dd")
  const vendor = (vendorName || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 30)
  const amountStr = amount.toFixed(2).replace(".", "_")
  return `${dateStr}_${vendor}_${amountStr}.${originalExtension}`
}
