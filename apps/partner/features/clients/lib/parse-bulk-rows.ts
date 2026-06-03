export interface ParsedBulkRow {
  clientName: string
  email: string
}

export interface ParseSummary {
  rows: ParsedBulkRow[]
  invalid: number
}

export function parseBulkRows(text: string): ParseSummary {
  const rows: ParsedBulkRow[] = []
  let invalid = 0

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const lastComma = line.lastIndexOf(",")
    if (lastComma === -1) {
      invalid++
      continue
    }

    const clientName = line.slice(0, lastComma).trim()
    const email = line.slice(lastComma + 1).trim().toLowerCase()

    if (!clientName || !email.includes("@")) {
      invalid++
      continue
    }

    rows.push({ clientName, email })
  }

  return { rows, invalid }
}
