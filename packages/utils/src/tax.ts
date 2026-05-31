export const SPANISH_IVA_RATES = [0.21, 0.10, 0.04, 0] as const
export type SpanishIvaRate = (typeof SPANISH_IVA_RATES)[number]

// Tax amount included in gross total (Spanish receipt convention: precio con IVA)
export function calculateTaxFromGross(gross: number, rate: number): number {
  if (rate === 0) return 0
  return Math.round((gross * rate / (1 + rate)) * 100) / 100
}
