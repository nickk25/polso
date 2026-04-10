/**
 * Score how well two amounts match.
 * Accounts for Spanish IVA rates (21%, 10%, 4%) — a transaction may be
 * the gross amount while the invoice shows the net (base imponible).
 *
 * Tolerance bands:
 *   <100€  → 4%
 *   100–1000€ → 2%
 *   >1000€ → 1.5%
 */

const SPANISH_IVA_RATES = [0.21, 0.10, 0.04] // general, reducido, superreducido

function toleranceForAmount(amount: number): number {
  const abs = Math.abs(amount)
  if (abs < 100) return 0.04
  if (abs < 1000) return 0.02
  return 0.015
}

function isWithinTolerance(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true
  if (a === 0 || b === 0) return false
  const tolerance = toleranceForAmount(Math.max(Math.abs(a), Math.abs(b)))
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) <= tolerance
}

export function scoreAmount(
  transactionAmount: number,
  inboxAmount: number | null
): number {
  if (inboxAmount === null) return 0

  const txAbs = Math.abs(transactionAmount)
  const inAbs = Math.abs(inboxAmount)

  // Exact match (within tolerance)
  if (isWithinTolerance(txAbs, inAbs)) return 1.0

  // Check IVA variants: inbox may show net amount
  for (const rate of SPANISH_IVA_RATES) {
    const gross = inAbs * (1 + rate)
    if (isWithinTolerance(txAbs, gross)) return 0.95
    // transaction may be net, inbox gross
    const net = inAbs / (1 + rate)
    if (isWithinTolerance(txAbs, net)) return 0.90
  }

  // Partial score based on relative difference
  const diff = Math.abs(txAbs - inAbs) / Math.max(txAbs, inAbs)
  if (diff <= 0.05) return 0.80
  if (diff <= 0.10) return 0.60
  if (diff <= 0.20) return 0.40
  if (diff <= 0.50) return 0.20
  return 0
}
