// PGC fallback when a category has no accountCode set.
// Keyed by category slug — same slugs used in seed.ts.
export const PGC_DEFAULTS: Record<string, string> = {
  "rent-mortgage": "621",
  "utilities": "628",
  "insurance": "625",
  "subscriptions": "629",
  "salaries-payroll": "640",
  "loan-payments": "662",
  "office-supplies": "629",
  "marketing-ads": "627",
  "software-tools": "629",
  "travel-transport": "629",
  "meals-entertainment": "629",
  "professional-services": "623",
  "equipment": "629",
  "miscellaneous": "629",
}

export const PGC_BANK = "572"
export const PGC_VAT_INPUT = "472"
export const PGC_VAT_OUTPUT = "477"
export const PGC_INCOME = "705"

export function resolveAccountCode(
  categoryAccountCode: string | null | undefined,
  categorySlug?: string | null
): string {
  if (categoryAccountCode) return categoryAccountCode
  if (categorySlug && PGC_DEFAULTS[categorySlug]) return PGC_DEFAULTS[categorySlug]
  return "629"
}
