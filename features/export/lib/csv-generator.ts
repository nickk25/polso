import { format } from "date-fns"

export interface ExpenseForCSV {
  date: Date
  amount: number
  currency: string
  description: string | null
  expenseType: "fixed" | "variable" | null
  status: string
  vendor: {
    name: string
  } | null
  category: {
    name: string
  } | null
  invoices: { id: string }[]
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

function escapeCSVField(value: string): string {
  // If the value contains comma, newline, or double quote, wrap in quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    // Escape double quotes by doubling them
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

export function generateCSV(expenses: ExpenseForCSV[]): string {
  const rows: string[] = []

  // Add header row
  rows.push(CSV_HEADERS.join(";"))

  // Add data rows
  for (const expense of expenses) {
    const row = [
      format(new Date(expense.date), "dd/MM/yyyy"),
      escapeCSVField(expense.vendor?.name || "Sin proveedor"),
      escapeCSVField(expense.description || ""),
      escapeCSVField(expense.category?.name || "Sin categoria"),
      expense.expenseType === "fixed" ? "Fijo" : "Variable",
      formatSpanishNumber(expense.amount),
      expense.currency,
      expense.invoices.length > 0 ? "Si" : "No",
    ]
    rows.push(row.join(";"))
  }

  // Use semicolon separator (more common in Spanish Excel)
  // Add BOM for Excel to recognize UTF-8
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
