/**
 * Tink to Polso Category Mapping
 *
 * Tink provides limited category data for Spanish banks.
 * The primary signal is `types.type` (e.g., "TRANSFER", "DEFAULT").
 * Detailed signals come from `types.financialInstitutionTypeCode` when available.
 *
 * Because Tink categories are less granular than Plaid's, confidence is
 * lower (70-80%). The keyword-matching layer in the app will handle the rest.
 *
 * Polso system category slugs:
 *   Fixed:    rent-mortgage, utilities, insurance, subscriptions, salaries-payroll, loan-payments
 *   Variable: office-supplies, marketing-ads, software-tools, travel-transport,
 *             meals-entertainment, professional-services, equipment, miscellaneous
 */

/**
 * Tink transaction type → Polso slug (70% confidence)
 * These are broad fallbacks based on Tink's top-level type field.
 */
const TINK_TYPE_TO_POLSO: Record<string, string> = {
  TRANSFER: "miscellaneous",
  // DEFAULT and UNDEFINED are too generic — skip; let keyword matching handle them
}

/**
 * Tink financialInstitutionTypeCode → Polso slug (80% confidence)
 * Provider-specific codes; varies by bank. Common Spanish bank codes:
 */
const TINK_DETAILED_TO_POLSO: Record<string, string> = {
  // Transport
  TRANSPORT: "travel-transport",
  GASOLINE: "travel-transport",
  TAXI: "travel-transport",
  PARKING: "travel-transport",
  FLIGHT: "travel-transport",
  HOTEL: "travel-transport",
  TRAIN: "travel-transport",

  // Food & Drink
  RESTAURANT: "meals-entertainment",
  FAST_FOOD: "meals-entertainment",
  COFFEE: "meals-entertainment",
  BAR: "meals-entertainment",
  SUPERMARKET: "office-supplies", // Polso doesn't have a groceries slug; closest is miscellaneous

  // Utilities
  ELECTRICITY: "utilities",
  GAS: "utilities",
  WATER: "utilities",
  INTERNET: "utilities",
  PHONE: "utilities",
  MOBILE: "utilities",

  // Subscriptions / Streaming
  STREAMING: "subscriptions",
  MUSIC: "subscriptions",
  GAMING: "subscriptions",
  SUBSCRIPTION: "subscriptions",

  // Insurance
  INSURANCE: "insurance",

  // Rent / Mortgage
  RENT: "rent-mortgage",
  MORTGAGE: "rent-mortgage",

  // Loans
  LOAN: "loan-payments",
  CREDIT_CARD_PAYMENT: "loan-payments",

  // Software / SaaS
  SOFTWARE: "software-tools",
  SAAS: "software-tools",
  CLOUD: "software-tools",

  // Professional services
  ACCOUNTING: "professional-services",
  LEGAL: "professional-services",
  CONSULTING: "professional-services",
  EDUCATION: "professional-services",

  // Equipment / Hardware
  HARDWARE: "equipment",
  ELECTRONICS: "equipment",
  FURNITURE: "equipment",
}

/**
 * Map Tink transaction categories to a Polso category slug.
 *
 * @param tinkType  Value of `types.type` from Tink transaction
 * @param tinkDetailedType  Value of `types.financialInstitutionTypeCode`
 */
export function mapTinkToPolsoCategory(
  tinkType: string | null | undefined,
  tinkDetailedType: string | null | undefined
): { slug: string; confidence: number } | null {
  // Try detailed type first (higher confidence)
  if (tinkDetailedType) {
    const upper = tinkDetailedType.toUpperCase()
    if (TINK_DETAILED_TO_POLSO[upper]) {
      return { slug: TINK_DETAILED_TO_POLSO[upper], confidence: 0.8 }
    }
  }

  // Fall back to broad type
  if (tinkType) {
    const upper = tinkType.toUpperCase()
    if (TINK_TYPE_TO_POLSO[upper]) {
      return { slug: TINK_TYPE_TO_POLSO[upper], confidence: 0.7 }
    }
  }

  return null
}
