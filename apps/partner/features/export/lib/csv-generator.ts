import { generateInvoiceFileName, escapeCsv } from "@polso/utils/export"
import {
  convertToJournalLines,
  a3Provider,
  sageProvider,
  type MappedTransaction,
} from "@polso/accounting"
import type { ExportableTransaction } from "../queries/get-exportable-data"

export { generateInvoiceFileName }

export type ExportFormat = "standard" | "a3" | "sage"

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
  "IVA %",
  "Cuota IVA",
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

function toMappedTransaction(row: ExportableTransaction): MappedTransaction {
  return {
    id: row.id,
    amount: row.amount,
    direction: "expense",
    currency: row.currency,
    date: new Date(row.date),
    description: row.description ?? "",
    counterpartyName: row.vendorName ?? row.merchantName ?? null,
    counterpartyTaxId: row.vendorTaxId ?? null,
    categoryAccountCode: row.categoryAccountCode ?? null,
    taxRate: row.taxRate ?? null,
    taxAmount: row.taxAmount ?? null,
    documentRef: row.attachmentFilePath ?? null,
  }
}

export function generateCsv(
  rows: ExportableTransaction[],
  separator = ";",
  exportFormat: ExportFormat = "standard"
): string {
  if (exportFormat === "a3") {
    const mapped = rows.map(toMappedTransaction)
    const lines = convertToJournalLines(mapped)
    return a3Provider.generate(lines, { separator })
  }

  if (exportFormat === "sage") {
    const mapped = rows.map(toMappedTransaction)
    const lines = convertToJournalLines(mapped)
    return sageProvider.generate(lines, { separator: "," })
  }

  // Standard format
  const lines: string[] = []
  lines.push("﻿" + HEADERS.map((h) => escapeCsv(h, separator)).join(separator))

  for (const row of rows) {
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
      row.taxRate !== null ? String(Math.round(row.taxRate * 100)) : "",
      row.taxAmount !== null ? formatAmount(row.taxAmount) : "",
    ]
    lines.push(cells.map((c) => escapeCsv(c, separator)).join(separator))
  }

  return lines.join("\r\n")
}
