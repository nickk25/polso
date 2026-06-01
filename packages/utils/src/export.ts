export function generateInvoiceFileName(
  date: Date,
  vendorName: string | null,
  amount: number,
  ext: string
): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const vendor = (vendorName ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 30)
  const amountStr = amount.toFixed(2).replace(".", "_")
  return `${y}-${m}-${d}_${vendor}_${amountStr}.${ext}`
}

export function escapeCsv(value: string | null | undefined, separator: string): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(separator) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
