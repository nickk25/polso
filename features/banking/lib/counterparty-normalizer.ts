/**
 * Normalize counterparty names for matching
 *
 * This helps identify the same vendor across different transactions
 * where the name might appear slightly differently.
 */

// Common suffixes to remove
const SUFFIXES_TO_REMOVE = [
  "S.L.",
  "S.L",
  "SL",
  "S.A.",
  "S.A",
  "SA",
  "S.L.U.",
  "SLU",
  "LTD",
  "LTD.",
  "LIMITED",
  "INC",
  "INC.",
  "CORP",
  "CORP.",
  "LLC",
  "GMBH",
  "AG",
  "BV",
  "NV",
]

// Common prefixes to remove (payment processors, etc.)
const PREFIXES_TO_REMOVE = [
  "PAYPAL \\*",
  "PAYPAL\\*",
  "PP\\*",
  "SQ \\*",
  "SQUARE \\*",
  "STRIPE \\*",
  "GOOGLE \\*",
  "APPLE\\.COM/BILL",
  "AMZN\\*",
  "AMAZON\\*",
]

// Known vendor name mappings for standardization
const VENDOR_MAPPINGS: Record<string, string> = {
  "netflix.com": "netflix",
  "netflix es": "netflix",
  "spotify ab": "spotify",
  "spotify.com": "spotify",
  "amazon prime": "amazon prime",
  "amazon.es": "amazon",
  "mercadona": "mercadona",
  "carrefour": "carrefour",
  "lidl": "lidl",
  "iberdrola": "iberdrola",
  "endesa": "endesa",
  "naturgy": "naturgy",
  "vodafone": "vodafone",
  "movistar": "movistar",
  "orange": "orange",
}

export function normalizeCounterpartyName(name: string): string {
  if (!name) return ""

  let normalized = name
    // Convert to lowercase
    .toLowerCase()
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    .trim()

  // Remove common prefixes (payment processors)
  for (const prefix of PREFIXES_TO_REMOVE) {
    const regex = new RegExp(`^${prefix}`, "i")
    normalized = normalized.replace(regex, "").trim()
  }

  // Remove common suffixes (company types)
  for (const suffix of SUFFIXES_TO_REMOVE) {
    const regex = new RegExp(`\\s*${suffix.replace(/\./g, "\\.")}\\s*$`, "i")
    normalized = normalized.replace(regex, "").trim()
  }

  // Remove reference numbers (common patterns like #12345, REF:12345)
  normalized = normalized
    .replace(/#\d+/g, "")
    .replace(/ref:\s*\d+/gi, "")
    .replace(/\*+\d+/g, "")
    .trim()

  // Remove trailing numbers that are likely transaction IDs
  normalized = normalized.replace(/\s+\d{4,}$/, "").trim()

  // Check for known vendor mappings
  for (const [pattern, standardName] of Object.entries(VENDOR_MAPPINGS)) {
    if (normalized.includes(pattern)) {
      return standardName
    }
  }

  // Remove any remaining special characters
  normalized = normalized
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return normalized
}

/**
 * Extract potential vendor name from transaction description
 */
export function extractVendorFromDescription(description: string): string | null {
  if (!description) return null

  // Common patterns in Spanish bank statements
  const patterns = [
    // "COMPRA EN VENDOR_NAME"
    /compra\s+en\s+(.+?)(?:\s+\d|$)/i,
    // "PAGO A VENDOR_NAME"
    /pago\s+a\s+(.+?)(?:\s+\d|$)/i,
    // "TRANSFERENCIA A VENDOR_NAME"
    /transferencia\s+a\s+(.+?)(?:\s+\d|$)/i,
    // "RECIBO VENDOR_NAME"
    /recibo\s+(.+?)(?:\s+\d|$)/i,
    // "BIZUM A VENDOR_NAME"
    /bizum\s+a\s+(.+?)(?:\s+\d|$)/i,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      return normalizeCounterpartyName(match[1])
    }
  }

  // If no pattern matches, try to normalize the whole description
  return normalizeCounterpartyName(description)
}
