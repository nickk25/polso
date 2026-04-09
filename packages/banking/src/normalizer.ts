/**
 * Counterparty name normalizer for vendor/client matching.
 * Spanish-market focused — strips payment processor prefixes,
 * company suffixes, reference numbers, and maps known vendors.
 *
 * Moved from apps/web/features/banking/lib/counterparty-normalizer.ts
 * so all apps can reuse the same normalization logic.
 */

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

  let normalized = name.toLowerCase().replace(/\s+/g, " ").trim()

  for (const prefix of PREFIXES_TO_REMOVE) {
    const regex = new RegExp(`^${prefix}`, "i")
    normalized = normalized.replace(regex, "").trim()
  }

  for (const suffix of SUFFIXES_TO_REMOVE) {
    const regex = new RegExp(`\\s*${suffix.replace(/\./g, "\\.")}\\s*$`, "i")
    normalized = normalized.replace(regex, "").trim()
  }

  normalized = normalized
    .replace(/#\d+/g, "")
    .replace(/ref:\s*\d+/gi, "")
    .replace(/\*+\d+/g, "")
    .trim()

  normalized = normalized.replace(/\s+\d{4,}$/, "").trim()

  for (const [pattern, standardName] of Object.entries(VENDOR_MAPPINGS)) {
    if (normalized.includes(pattern)) {
      return standardName
    }
  }

  normalized = normalized
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return normalized
}

/**
 * Extract vendor name from Spanish bank statement description patterns.
 */
export function extractVendorFromDescription(description: string): string | null {
  if (!description) return null

  const patterns = [
    /compra\s+en\s+(.+?)(?:\s+\d|$)/i,
    /pago\s+a\s+(.+?)(?:\s+\d|$)/i,
    /transferencia\s+a\s+(.+?)(?:\s+\d|$)/i,
    /recibo\s+(.+?)(?:\s+\d|$)/i,
    /bizum\s+a\s+(.+?)(?:\s+\d|$)/i,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match?.[1]) {
      return normalizeCounterpartyName(match[1])
    }
  }

  return normalizeCounterpartyName(description)
}
