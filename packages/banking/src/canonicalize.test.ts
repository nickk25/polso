import { describe, it, expect } from "vitest"
import { canonicalize } from "./canonicalize"

const key = (s: string, structured = false) => canonicalize(s, { structured }).matchKey

// ── §5.3 Canonical expectations: raw → { matchKey, displayName, seenLocations } ──
describe("canonicalize — canonical expectations", () => {
  const cases: Array<{ raw: string; matchKey: string; display: string; locations?: string[] }> = [
    { raw: "Compra Canva* I04706-45793541, Canva.com, Tarjeta 4176570", matchKey: "canva", display: "Canva" },
    { raw: "Compra Apple.com/bill, 900812703, Tarjeta 4176570", matchKey: "apple", display: "Apple" },
    { raw: "Compra Apple.com/bill, Itunes.com, Tarjeta 4176570", matchKey: "apple", display: "Apple" },
    { raw: "Compra Amazon* Rv0u31hk4, Luxembourg, Tarjeta 4176570", matchKey: "amazon", display: "Amazon", locations: ["luxembourg"] },
    { raw: "Compra Www.amazon* Na58c3tm4, Luxembourg, Tarjeta 4176570", matchKey: "amazon", display: "Amazon", locations: ["luxembourg"] },
    { raw: "Compra Amzn Mktp Es*Xk7gh, Luxembourg, Tarjeta 4176570", matchKey: "amazon", display: "Amazon", locations: ["luxembourg"] },
    { raw: "Compra Prime Video *068ex6gk5, Primevideo.es, Tarjeta 4176570", matchKey: "prime video", display: "Prime Video" },
    { raw: "Compra Vercel Inc., Vercel.com, Tarjeta 4176570", matchKey: "vercel", display: "Vercel" },
    { raw: "Compra Anthropic Pbc, Anthropic.com, Tarjeta 4176570", matchKey: "anthropic", display: "Anthropic" },
    { raw: "Compra Railway, Railway.app, Tarjeta 4176570", matchKey: "railway", display: "Railway" },
    { raw: "Compra Facebk *7e5tlyus52, Facebook.com, Tarjeta 4176570", matchKey: "facebook", display: "Facebook" },
    { raw: "Compra Wix.com 1236599309, Luxembourg, Tarjeta 4176570", matchKey: "wix", display: "Wix", locations: ["luxembourg"] },
    { raw: "Compra Uber *trip Help.uber.com, Help.uber.com, Tarjeta 4176570", matchKey: "uber", display: "Uber" },
    { raw: "Paypal *Netflix, 35314369001, Tarjeta 4176570", matchKey: "netflix", display: "Netflix" },
    { raw: "Compra Lufthansa 2204095147589, Madrid, Tarjeta 4176570", matchKey: "lufthansa", display: "Lufthansa", locations: ["madrid"] },
    { raw: "Compra Air France 0574231239552, Frankfurt, Tarjeta 4176570", matchKey: "air france", display: "Air France", locations: ["frankfurt"] },
    { raw: "Compra Zara, Donostia-san, Tarjeta 4176570", matchKey: "zara", display: "Zara" },
    { raw: "Compra Zara Home, Donostia-san, Tarjeta 4176570", matchKey: "home zara", display: "Zara Home" },
    { raw: "Compra Bershka, Donostia-san, Tarjeta 4176570", matchKey: "bershka", display: "Bershka" },
    { raw: "Compra Ikea Iberica Web, San Sebastian, Tarjeta 4176570", matchKey: "ikea", display: "Ikea" },
    { raw: "Compra Bertys Burger Bilbao, Bilbao, Tarjeta 4176570", matchKey: "bertys burger", display: "Bertys Burger", locations: ["bilbao"] },
    { raw: "Recibo Asesoria Larrea Sl Nº Recibo 0049 0701 755 Bbtddyn", matchKey: "asesoria larrea", display: "Asesoria Larrea" },
    { raw: "Recibo Tgss Cotizacion 28 0123456789 Periodo 03", matchKey: "gov:tgss", display: "TGSS" },
    { raw: "Recibo Diputacion Foral De Gipuzkoa, Concepto: Rf5", matchKey: "gov:diputacion foral de:gipuzkoa", display: "Diputacion Foral de Gipuzkoa" },
    { raw: "Recibo Diputacion Foral De Bizkaia", matchKey: "gov:diputacion foral de:bizkaia", display: "Diputacion Foral de Bizkaia" },
    { raw: "Transferencia A Juan Perez Garcia, Nomina", matchKey: "garcia juan perez", display: "Juan Perez Garcia" },
    { raw: "Bizum De Juan Perez, Comida", matchKey: "juan perez", display: "Juan Perez" },
  ]

  for (const c of cases) {
    it(`"${c.raw.slice(0, 40)}…" → ${c.matchKey}`, () => {
      const r = canonicalize(c.raw)
      expect(r.matchKey).toBe(c.matchKey)
      expect(r.displayName).toBe(c.display)
      if (c.locations) expect(r.seenLocations.sort()).toEqual(c.locations.sort())
    })
  }
})

// ── §5.1 Must-merge: same matchKey ──────────────────────────────────────────────
describe("canonicalize — must-merge pairs share a matchKey", () => {
  const pairs: Array<[string, string]> = [
    ["Compra Amazon* Rv0u31hk4, Luxembourg, Tarjeta 41", "Compra Www.amazon* Na58c3tm4, Luxembourg, Tarjeta 41"],
    ["Compra Amazon* Rv0u31hk4, Tarjeta 41", "Compra Amzn Mktp Es*Xk7gh, Tarjeta 41"],
    ["Compra Canva* I04706-45793541, Canva.com", "Compra Canva* I05821-99887766, Canva.com"],
    ["Compra Apple.com/bill, 900812703", "Compra Apple.com/bill, Itunes.com"],
    ["Recibo Asesoria Larrea Sl Nº Recibo 0049 0701 755 Bbtddyn", "Recibo Asesoria Larrea Sl Nº Recibo 0049 0702 888 Bbtxxyz"],
    ["Compra Lufthansa 2204095147589, Madrid", "Compra Lufthansa 9988776655443, Frankfurt"],
    ["Compra Zara, Donostia-san", "Compra Zara, Madrid"],
    ["Compra Vercel Inc., Vercel.com", "Compra Vercel Vercel.com"],
    ["Compra Facebk *7e5tlyus52, Facebook.com", "Compra Facebk *9a2bb1cc3, Facebook.com"],
    ["Compra Prime Video *068ex6gk5, Primevideo.es", "Compra Prime Video *4471aa22z, Primevideo.es"],
    ["Compra Anthropic, Anthropic.com", "Compra Anthropic Pbc, Anthropic.com"],
    ["Compra Railway, Railway.app", "Compra Railway.app 1029384"],
    ["Recibo Tgss Cotizacion 28 0123456789 Periodo 03", "Recibo Tgss Cotizacion 28 0123456789 Periodo 04"],
    ["Pago Apple.com/bill 900812703", "Compra Apple.com/bill, Itunes.com"],
    ["Paypal *Netflix, 35314369001", "Compra Netflix.com, Amsterdam"],
    ["Compra Ikea Iberica Web, San Sebastian", "Compra Ikea, Barakaldo"],
    ["Compra Zara Home, Donostia-san", "Compra Zara Home, Bilbao"],
  ]

  for (const [a, b] of pairs) {
    it(`merge: "${a.slice(0, 28)}…" == "${b.slice(0, 28)}…"`, () => {
      expect(key(a)).toBe(key(b))
      expect(key(a)).not.toBe("")
    })
  }
})

// ── §5.2 Must-NOT-merge: different matchKey ────────────────────────────────────
describe("canonicalize — must-not-merge pairs have distinct matchKeys", () => {
  const pairs: Array<[string, string]> = [
    ["Compra Apple.com/bill, Tarjeta 41", "Compra Zara, Donostia-san, Tarjeta 41"],
    ["Compra Lufthansa 2204095147589, Madrid", "Compra Air France 0574231239552, Frankfurt"],
    ["Compra Zara, Donostia-san", "Compra Zara Home, Donostia-san"],
    ["Compra Zara, Donostia-san", "Compra Bershka, Donostia-san"],
    ["Compra Vercel Inc., Vercel.com", "Compra Railway, Railway.app"],
    ["Recibo Tgss Cotizacion 28 0123456789", "Recibo Diputacion Foral De Gipuzkoa"],
    ["Recibo Diputacion Foral De Gipuzkoa", "Recibo Diputacion Foral De Bizkaia"],
    ["Transferencia A Juan Perez Garcia", "Transferencia A Maria Lopez Ruiz"],
    ["Compra Prime Video *068ex6gk5, Primevideo.es", "Compra Amazon* Rv0u31hk4, Luxembourg"],
    ["Compra Canva* I04706-45793541, Canva.com", "Compra Wix.com 1236599309, Luxembourg"],
    ["Compra Uber *trip Help.uber.com", "Compra Cabify, Madrid"],
    ["Compra The Net Lab Llc, Thenet-lab.co", "Compra Wix.com 1236599309"],
  ]

  for (const [a, b] of pairs) {
    it(`distinct: "${a.slice(0, 28)}…" != "${b.slice(0, 28)}…"`, () => {
      expect(key(a)).not.toBe(key(b))
    })
  }
})

// ── Structured-field path: creditorName variants unify with card-derived keys ──
describe("canonicalize — structured payee names unify via contains-based aliases", () => {
  it("AMAZON PAYMENTS EUROPE S.C.A. (structured) → amazon", () => {
    expect(key("AMAZON PAYMENTS EUROPE S.C.A.", true)).toBe("amazon")
  })
  it("structured Amazon == card-derived amazon", () => {
    expect(key("AMAZON PAYMENTS EUROPE S.C.A.", true)).toBe(key("Compra Amzn Mktp Es*Xk7gh, Tarjeta 41"))
  })
  it("structured names keep numeric brands (digit-killer skipped)", () => {
    // unstructured would drop "365" as a digit run; structured keeps it
    expect(key("Office 365", true)).toBe("365 office")
  })
})

// ── Idempotency: canonicalize(displayName) is stable ───────────────────────────
describe("canonicalize — idempotent on its own output", () => {
  const samples = [
    "Compra Amazon* Rv0u31hk4, Luxembourg, Tarjeta 41",
    "Recibo Asesoria Larrea Sl Nº Recibo 0049 0701 755 Bbtddyn",
    "Compra Zara Home, Donostia-san",
  ]
  for (const s of samples) {
    it(`stable: "${s.slice(0, 28)}…"`, () => {
      const once = canonicalize(s)
      const twice = canonicalize(once.displayName)
      expect(twice.matchKey).toBe(once.matchKey)
    })
  }
})

// ── Real-data regressions (found via the production dry-run) ───────────────────
describe("canonicalize — real-data regressions", () => {
  it("abbreviated 'Tarj. :*080701' is stripped (not left as a 'tarj' token)", () => {
    expect(key("Compra Internet En Sequra, Barcelona Es, Tarj. :*080701")).toBe("sequra")
    expect(key("Pago Movil En Sequra, Barcelona, Tarj. :*080701")).toBe("sequra")
  })
  it("'a favor de' beneficiary phrasing does not pollute the person key", () => {
    expect(key("Transferencia A Favor De Nicolas Arambulo, Concepto Pago")).toBe("arambulo nicolas")
  })
  it("POS-terminal-only contactless rows canonicalize to empty (no vendor)", () => {
    expect(key("Transaccion Contactless En 11931 San Seb")).toBe("")
  })
  it("payment-channel prefixes resolve to the real merchant", () => {
    expect(key("Pago Movil En Kai Sushi, Donostia San, Tarj. :*080701")).toBe("kai sushi")
  })
})

// ── Empty / generic suppression ────────────────────────────────────────────────
describe("canonicalize — empty + generic inputs", () => {
  it("empty input → empty key", () => {
    expect(canonicalize("").matchKey).toBe("")
    expect(canonicalize(null).matchKey).toBe("")
  })
  it("pure operation noise → empty key (generic, suppressed downstream)", () => {
    expect(canonicalize("Transaccion Movil").matchKey).toBe("")
    expect(canonicalize("Compra Internet").matchKey).toBe("")
  })
})
