/**
 * Plaid to Polso Category Mapping
 *
 * Maps Plaid's personal_finance_category to Polso system categories.
 * Plaid uses a two-level hierarchy: primary and detailed categories.
 *
 * Polso System Categories (slugs):
 * Fixed: rent-mortgage, utilities, insurance, subscriptions, salaries-payroll, loan-payments
 * Variable: office-supplies, marketing-ads, software-tools, travel-transport,
 *           meals-entertainment, professional-services, equipment, miscellaneous
 */

/**
 * Primary category mapping (lower confidence - 80%)
 * Used when detailed category doesn't match
 */
export const PLAID_PRIMARY_TO_POLSO: Record<string, string> = {
  // Direct mappings
  LOAN_PAYMENTS: "loan-payments",
  TRANSPORTATION: "travel-transport",
  TRAVEL: "travel-transport",
  FOOD_AND_DRINK: "meals-entertainment",
  ENTERTAINMENT: "meals-entertainment",

  // Business-relevant
  GENERAL_SERVICES: "professional-services",
  GENERAL_MERCHANDISE: "office-supplies",

  // Fallbacks
  RENT_AND_UTILITIES: "utilities",
  BANK_FEES: "miscellaneous",
  MEDICAL: "miscellaneous",
  PERSONAL_CARE: "miscellaneous",
  HOME_IMPROVEMENT: "equipment",
  GOVERNMENT_AND_NON_PROFIT: "miscellaneous",
}

/**
 * Detailed category mapping (higher confidence - 90%)
 * Takes precedence over primary mapping
 */
export const PLAID_DETAILED_TO_POLSO: Record<string, string> = {
  // Rent & Mortgage
  RENT_AND_UTILITIES_RENT: "rent-mortgage",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "rent-mortgage",

  // Utilities
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: "utilities",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "utilities",
  RENT_AND_UTILITIES_TELEPHONE: "utilities",
  RENT_AND_UTILITIES_WATER: "utilities",
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: "utilities",
  RENT_AND_UTILITIES_OTHER_UTILITIES: "utilities",

  // Insurance
  GENERAL_SERVICES_INSURANCE: "insurance",

  // Subscriptions
  ENTERTAINMENT_TV_AND_MOVIES: "subscriptions",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "subscriptions",
  ENTERTAINMENT_VIDEO_GAMES: "subscriptions",

  // Loan Payments
  LOAN_PAYMENTS_CAR_PAYMENT: "loan-payments",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "loan-payments",
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: "loan-payments",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "loan-payments",
  LOAN_PAYMENTS_OTHER_PAYMENT: "loan-payments",

  // Office Supplies
  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: "office-supplies",
  GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS: "office-supplies",

  // Software & Tools
  GENERAL_MERCHANDISE_ELECTRONICS: "software-tools",

  // Travel & Transport
  TRANSPORTATION_GAS: "travel-transport",
  TRANSPORTATION_PARKING: "travel-transport",
  TRANSPORTATION_PUBLIC_TRANSIT: "travel-transport",
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: "travel-transport",
  TRANSPORTATION_TOLLS: "travel-transport",
  TRANSPORTATION_BIKES_AND_SCOOTERS: "travel-transport",
  TRAVEL_FLIGHTS: "travel-transport",
  TRAVEL_LODGING: "travel-transport",
  TRAVEL_RENTAL_CARS: "travel-transport",

  // Meals & Entertainment
  FOOD_AND_DRINK_RESTAURANT: "meals-entertainment",
  FOOD_AND_DRINK_FAST_FOOD: "meals-entertainment",
  FOOD_AND_DRINK_COFFEE: "meals-entertainment",
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: "meals-entertainment",
  ENTERTAINMENT_CASINOS_AND_GAMBLING: "meals-entertainment",
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: "meals-entertainment",

  // Professional Services
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: "professional-services",
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: "professional-services",
  GENERAL_SERVICES_EDUCATION: "professional-services",
  GENERAL_SERVICES_POSTAGE_AND_SHIPPING: "professional-services",

  // Equipment
  HOME_IMPROVEMENT_FURNITURE: "equipment",
  HOME_IMPROVEMENT_HARDWARE: "equipment",
  HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE: "equipment",
}

/**
 * Map Plaid categories to Polso category slug
 */
export function mapPlaidToPolsoCategory(
  primary: string | null | undefined,
  detailed: string | null | undefined
): { slug: string; confidence: number } | null {
  // Try detailed first (higher confidence)
  if (detailed && PLAID_DETAILED_TO_POLSO[detailed]) {
    return {
      slug: PLAID_DETAILED_TO_POLSO[detailed],
      confidence: 0.9,
    }
  }

  // Fall back to primary
  if (primary && PLAID_PRIMARY_TO_POLSO[primary]) {
    return {
      slug: PLAID_PRIMARY_TO_POLSO[primary],
      confidence: 0.8,
    }
  }

  return null
}
