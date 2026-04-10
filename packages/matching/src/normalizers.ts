/**
 * Normalize a merchant/vendor name for comparison.
 * Strips Spanish legal suffixes, punctuation, and lowercases.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return ""

  return name
    .toLowerCase()
    // Remove Spanish legal suffixes
    .replace(/\bs\.l\.u?\b/g, "")
    .replace(/\bs\.a\.u?\b/g, "")
    .replace(/\bs\.c\b/g, "")
    .replace(/\bs\.l\.l\b/g, "")
    .replace(/\bsl\b/g, "")
    .replace(/\bsa\b/g, "")
    .replace(/\bslu\b/g, "")
    // Remove English suffixes (still appear in some Spanish companies)
    .replace(/\binc\b/g, "")
    .replace(/\bllc\b/g, "")
    .replace(/\bltd\b/g, "")
    .replace(/\bcorp\b/g, "")
    // Strip punctuation
    .replace(/[.,;:\-_\/\\()*&%$#@!]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
}

/** Split a normalized name into tokens */
export function tokenize(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t.length > 1) // drop single chars
}

/** Jaccard similarity between two token sets */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1
  if (a.length === 0 || b.length === 0) return 0

  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = [...setA].filter((t) => setB.has(t)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

/** Whether one string contains the other (normalized) */
export function substringMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  return na.includes(nb) || nb.includes(na)
}

/** Strip non-alphanumeric chars from a CIF/NIF for comparison */
export function normalizeCif(cif: string | null | undefined): string {
  if (!cif) return ""
  return cif.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}
