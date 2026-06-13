/**
 * Canonical vendor-identity resolver.
 *
 * Turns a raw bank-statement counterparty string into a stable identity:
 *   - `matchKey`     — the dedup/auto-merge key. Either a sorted, cleaned token
 *                      set ("amazon", "asesoria larrea") or a government key
 *                      ("gov:tgss", "gov:diputacion foral de:gipuzkoa").
 *   - `displayName`  — the human-facing label.
 *   - `seenLocations`— city/place tokens stripped from the key, kept as metadata.
 *
 * Design rules (see docs/VENDOR_MATCHING_AUDIT.md):
 *   - Run ONCE at ingestion, never at match time. Idempotent.
 *   - Government bodies are carved out FIRST, before any stripping, so their
 *     discriminator (province / agency) survives.
 *   - Location is stripped from the key but retained as metadata (a vendor in
 *     two cities is one vendor).
 *   - Structured payee names (creditorName/debtorName) skip the aggressive
 *     digit/PAN killer and bank-noise strips, but still run alias + suffix +
 *     subsidiary + stopword normalization so they unify with card-derived keys.
 *   - Alias matching is CONTAINS-based, so "Amazon Payments Europe S.C.A."
 *     (structured) collapses to the same `amazon` as a card "AMZN MKTP".
 */

export interface CanonicalIdentity {
  matchKey: string
  displayName: string
  seenLocations: string[]
}

export interface CanonicalizeOptions {
  /** True when the source was a structured payee field (creditorName/debtorName). */
  structured?: boolean
}

// ── Government carve-out ──────────────────────────────────────────────────────
// Each entry: detect on the lowercased raw string; build a stable gov key.
// Province / municipality is the discriminator (distinct legal entities); TGSS
// and the tax agency are single national entities → keyed by agency alone, so
// every receipt collapses to one vendor (the v1 vendor-level identity choice —
// we deliberately do NOT split TGSS by CCC/contribution account).
interface GovRule {
  test: RegExp
  /** Build [keySuffix, displayName] from the match. */
  build: (m: RegExpMatchArray) => [string, string]
}

const GOV_RULES: GovRule[] = [
  {
    test: /diputaci[oó]n\s+foral\s+de\s+([a-záéíóúñ]+)/i,
    build: (m) => [`diputacion foral de:${stripAccents(m[1].toLowerCase())}`, `Diputacion Foral de ${titleCase(m[1])}`],
  },
  {
    test: /ayuntamiento\s+de\s+([a-záéíóúñ]+)/i,
    build: (m) => [`ayuntamiento de:${stripAccents(m[1].toLowerCase())}`, `Ayuntamiento de ${titleCase(m[1])}`],
  },
  {
    test: /\btgss\b|tesorer[ií]a\s+general\s+de\s+la\s+seguridad\s+social/i,
    build: () => ["tgss", "TGSS"],
  },
  {
    test: /agencia\s+tributaria|\baeat\b|hacienda\s+(?:foral|estatal|p[uú]blica|tributaria)/i,
    build: () => ["agencia tributaria", "Agencia Tributaria"],
  },
]

// ── Lexicons ──────────────────────────────────────────────────────────────────
// Processor wrappers / bank-noise rewrites (applied to the lowercased string,
// before punctuation is flattened). Order matters: specific first.
const PROCESSOR_REWRITES: Array<[RegExp, string]> = [
  [/\bamzn\s+mktp\b[^,]*/g, " amazon "],
  [/\bamzn\s*\*\s*/g, " amazon "],
  [/\bwww\.amazon\b\S*/g, " amazon "],
  [/\bamazon\s*\*\s*/g, " amazon "],
  [/\bapple\.com\/bill\b/g, " apple "],
  [/\b(?:paypal|pp|sq|square|sp|stripe|google)\s*\*\s*/g, " "],
]

// Bank-noise strips (unstructured only): card + commission + ref/memo tails.
const CARD_NOISE: Array<[RegExp, string]> = [
  [/\btarjeta\b[\s\d]*/gi, " "],
  [/\btarj\b\.?[\s:.*\d]*/gi, " "], // abbreviated "Tarj. :*080701"
  [/\bcomisi[oó]n\b[\s\d.,]*/gi, " "],
]
const MEMO_TAIL = /\b(?:concepto|n[ºo]\s*recibo|ref(?:erencia)?)\b.*$/i

// Curated, explicit location list (never heuristic). Grows via observed data.
const LOCATIONS = new Set([
  "madrid", "barcelona", "bilbao", "donostia", "san", "sebastian", "gipuzkoa",
  "sebas", "sebastia", "sebastianes", "seb", // truncated "San Sebastián" variants in bank descriptors
  "donostia-san", "barakaldo", "arteixo", "valencia", "sevilla", "malaga",
  "zaragoza", "luxembourg", "amsterdam", "frankfurt", "hamburg", "bordeaux",
  "dublin", "cork", "singapore", "paris", "london", "lisboa", "lisbon",
])

const SUBSIDIARY_WORDS = new Set([
  "iberica", "iberia", "espana", "españa", "spain", "europe", "europa",
  "international", "global",
])

const LEGAL_SUFFIX = new Set([
  "sl", "slu", "sa", "sau", "sc", "sll", "scp", "sociedad", "limitada",
  "inc", "llc", "ltd", "limited", "corp", "co", "company", "gmbh", "ag",
  "bv", "nv", "pbc", "oy", "oyj", "sas", "sarl", "spa", "srl", "plc", "kg", "kft",
])

const STOPWORDS = new Set([
  // operation verbs / bank boilerplate
  "compra", "recibo", "pago", "cargo", "abono", "adeudo", "devolucion",
  "transferencia", "transaccion", "bizum", "trf", "transf", "inmediata",
  "tarjeta", "comision", "comisión", "concepto", "recibos",
  // articles / prepositions
  "de", "del", "la", "el", "los", "las", "y", "en", "a",
  // domain / channel noise
  "web", "www", "com", "es", "net", "org", "app", "online", "help", "trip", "bill",
  // generic operation nouns / payment-channel words that are not vendors
  "movil", "internet", "the", "contactless", "favor", "tarj",
])

const BRAND_ALLOWLIST = new Set(["3m", "m6", "o2", "s4"])

// Vendor aliases — first whose any pattern is a substring of the cleaned,
// space-joined token string wins. Restores the legacy VENDOR_MAPPINGS and folds
// in the audit oracle's expectations. Order: multi-word / specific first.
interface Alias {
  patterns: string[]
  key: string
  display: string
}
const ALIASES: Alias[] = [
  { patterns: ["zara home"], key: "zara home", display: "Zara Home" },
  { patterns: ["prime video", "primevideo", "amazon prime"], key: "prime video", display: "Prime Video" },
  { patterns: ["air france"], key: "air france", display: "Air France" },
  { patterns: ["apple"], key: "apple", display: "Apple" },
  { patterns: ["amazon", "amzn"], key: "amazon", display: "Amazon" },
  { patterns: ["facebook", "facebk"], key: "facebook", display: "Facebook" },
  { patterns: ["netflix"], key: "netflix", display: "Netflix" },
  { patterns: ["spotify"], key: "spotify", display: "Spotify" },
  { patterns: ["vercel"], key: "vercel", display: "Vercel" },
  { patterns: ["railway"], key: "railway", display: "Railway" },
  { patterns: ["anthropic"], key: "anthropic", display: "Anthropic" },
  { patterns: ["canva"], key: "canva", display: "Canva" },
  { patterns: ["wix"], key: "wix", display: "Wix" },
  { patterns: ["uber"], key: "uber", display: "Uber" },
  { patterns: ["cabify"], key: "cabify", display: "Cabify" },
  { patterns: ["lufthansa"], key: "lufthansa", display: "Lufthansa" },
  { patterns: ["ikea"], key: "ikea", display: "Ikea" },
  { patterns: ["zara"], key: "zara", display: "Zara" },
  { patterns: ["bershka"], key: "bershka", display: "Bershka" },
  { patterns: ["iberdrola"], key: "iberdrola", display: "Iberdrola" },
  { patterns: ["endesa"], key: "endesa", display: "Endesa" },
  { patterns: ["naturgy"], key: "naturgy", display: "Naturgy" },
  { patterns: ["vodafone"], key: "vodafone", display: "Vodafone" },
  { patterns: ["movistar"], key: "movistar", display: "Movistar" },
  { patterns: ["orange"], key: "orange", display: "Orange" },
  { patterns: ["mercadona"], key: "mercadona", display: "Mercadona" },
  { patterns: ["carrefour"], key: "carrefour", display: "Carrefour" },
  { patterns: ["lidl"], key: "lidl", display: "Lidl" },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function isJunkToken(t: string): boolean {
  if (BRAND_ALLOWLIST.has(t)) return false
  if (/^\d+$/.test(t)) return true // pure numeric (PAN fragments, "00")
  if (/\d{2,}/.test(t)) return true // any run of 2+ digits
  if (/\d/.test(t) && /[a-z]/.test(t)) return true // alnum mix: rv0u31hk4, i04706
  return false
}

function dedupePreserveOrder(tokens: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

function matchAlias(joined: string): Alias | null {
  for (const alias of ALIASES) {
    if (alias.patterns.some((p) => joined.includes(p))) return alias
  }
  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function canonicalize(
  name: string | null | undefined,
  { structured = false }: CanonicalizeOptions = {}
): CanonicalIdentity {
  if (!name || !name.trim()) {
    return { matchKey: "", displayName: "", seenLocations: [] }
  }

  const lowered = name.toLowerCase().replace(/\s+/g, " ").trim()

  // 1) Government carve-out — before any stripping.
  for (const rule of GOV_RULES) {
    const m = lowered.match(rule.test)
    if (m) {
      const [suffix, display] = rule.build(m)
      return { matchKey: `gov:${suffix}`, displayName: display, seenLocations: [] }
    }
  }

  // 2) Vendor branch.
  let working = lowered

  // For person-to-person transfers the text after the first comma is a free-text
  // concepto memo ("…, Nomina", "…, Comida"), not part of the payee — dropping it
  // prevents the memo from re-fragmenting one person across many keys.
  if (!structured && /^(?:transferencia|transf|trf|bizum)\b/.test(lowered)) {
    working = working.split(",")[0]
  }

  for (const [re, repl] of PROCESSOR_REWRITES) working = working.replace(re, repl)

  if (!structured) {
    for (const [re, repl] of CARD_NOISE) working = working.replace(re, repl)
    working = working.replace(MEMO_TAIL, " ")
  }

  // Flatten punctuation to spaces (processor rewrites that needed . * / already ran).
  working = working.replace(/[^\w\s]/g, " ").replace(/_/g, " ").replace(/\s+/g, " ").trim()

  let tokens = working.split(" ").filter(Boolean)

  // 3) Reference / PAN killer (skipped for structured names).
  if (!structured) tokens = tokens.filter((t) => !isJunkToken(t))

  // 4) Location → metadata.
  const seenLocations: string[] = []
  tokens = tokens.filter((t) => {
    if (LOCATIONS.has(t)) {
      seenLocations.push(t)
      return false
    }
    return true
  })

  // 5) Subsidiary / legal-suffix / stopword strip + length filter + dedupe.
  tokens = tokens.filter(
    (t) => t.length > 1 && !SUBSIDIARY_WORDS.has(t) && !LEGAL_SUFFIX.has(t) && !STOPWORDS.has(t)
  )
  tokens = dedupePreserveOrder(tokens)

  // 6) Alias resolution (contains-based) or assemble from surviving tokens.
  const joined = tokens.join(" ")
  const alias = matchAlias(joined)

  if (alias) {
    const keyTokens = dedupePreserveOrder(alias.key.split(" ")).sort()
    return {
      matchKey: keyTokens.join(" "),
      displayName: alias.display,
      seenLocations: dedupePreserveOrder(seenLocations),
    }
  }

  const matchKey = [...tokens].sort().join(" ")
  let displayName = titleCase(tokens.join(" "))
  // Re-attach a leading article that we stripped, for nicer display only.
  if (/^the\b/.test(lowered) && displayName) displayName = `The ${displayName}`

  return { matchKey, displayName, seenLocations: dedupePreserveOrder(seenLocations) }
}

/** Split a vendor matchKey into its brand tokens (for merge blocking). Gov keys → []. */
export function brandTokens(matchKey: string): string[] {
  if (!matchKey || matchKey.startsWith("gov:")) return []
  return matchKey.split(" ").filter(Boolean)
}

/** Whether a matchKey denotes a government entity. */
export function isGovKey(matchKey: string): boolean {
  return matchKey.startsWith("gov:")
}
