import { generateInvoiceFileName, escapeCsv } from "@polso/utils/export"
import type { ExportableTransaction } from "../queries/get-exportable-data"

export { generateInvoiceFileName }

const HEADERS = [
  "Fecha",
  "Descripción",
  "Comercio",
  "Importe",
  "Moneda",
  "Categoría",
  "Tipo",
  "Proveedor",
  "Cuenta bancaria",
  "Estado conciliación",
  "Archivo adjunto",
  "Notas",
]

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace(".", ",")
}


export function generateCsv(
  rows: ExportableTransaction[],
  separator = ";"
): string {
  const lines: string[] = []

  lines.push(HEADERS.map((h) => escapeCsv(h, separator)).join(separator))

  for (const row of rows) {
    // Use the renamed filename so accountants can cross-reference with facturas/ folder
    const attachmentDisplay = row.attachmentFilePath
      ? generateInvoiceFileName(
          row.date,
          row.vendorName,
          row.amount,
          row.attachmentFileName?.split(".").pop() ?? "pdf"
        )
      : ""

    const cells = [
      formatDate(row.date),
      row.description ?? "",
      row.merchantName ?? "",
      formatAmount(row.amount),
      row.currency,
      row.categoryName ?? "",
      row.expenseType ?? "",
      row.vendorName ?? "",
      row.accountName,
      row.conciliationStatus === "matched" ? "Conciliado" : "Sin conciliar",
      attachmentDisplay,
      row.notes ?? "",
    ]
    lines.push(cells.map((c) => escapeCsv(c, separator)).join(separator))
  }

  return lines.join("\r\n")
}
