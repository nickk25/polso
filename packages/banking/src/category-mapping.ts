/**
 * GoCardless → Polso category mapping.
 *
 * GoCardless provides two category signals:
 *   - proprietaryBankTransactionCode: bank-specific strings ("Transfer", "Card purchase", etc.)
 *   - merchantCategoryCode: ISO 18245 MCC codes ("5411" = grocery stores)
 *
 * MCC codes are more reliable when present (card transactions only).
 * Proprietary codes vary by bank but cover transfers and direct debits.
 *
 * Polso system category slugs:
 *   Fixed:    rent-mortgage, utilities, insurance, subscriptions, salaries-payroll, loan-payments
 *   Variable: office-supplies, marketing-ads, software-tools, travel-transport,
 *             meals-entertainment, professional-services, equipment, miscellaneous
 */

/**
 * ISO 18245 MCC → Polso slug (85% confidence — card transactions)
 */
const MCC_TO_POLSO: Record<string, string> = {
  // Food & Dining
  "5411": "meals-entertainment", // Grocery stores
  "5412": "meals-entertainment", // Convenience stores
  "5812": "meals-entertainment", // Restaurants
  "5813": "meals-entertainment", // Bars / taverns
  "5814": "meals-entertainment", // Fast food
  "5441": "meals-entertainment", // Candy / confectionery

  // Travel & Transport
  "4111": "travel-transport", // Local transport / commuter
  "4112": "travel-transport", // Passenger railways
  "4121": "travel-transport", // Taxicabs / rideshare
  "4131": "travel-transport", // Bus lines
  "4511": "travel-transport", // Airlines
  "4722": "travel-transport", // Travel agencies
  "7011": "travel-transport", // Hotels / motels
  "7523": "travel-transport", // Parking lots / garages
  "5541": "travel-transport", // Service stations / fuel
  "5542": "travel-transport", // Automated fuel dispensers
  "7512": "travel-transport", // Car rental

  // Utilities
  "4911": "utilities", // Electric utilities
  "4924": "utilities", // Natural gas
  "4941": "utilities", // Water / sewer
  "4813": "utilities", // Phone / telecom
  "4814": "utilities", // Telecommunication services
  "4899": "utilities", // Cable / satellite TV
  "4900": "utilities", // Utilities (generic)

  // Software & Tech
  "5045": "software-tools", // Computers / peripherals
  "7372": "software-tools", // Computer programming / software
  "7371": "software-tools", // Computer services

  // Equipment / Hardware
  "5065": "equipment", // Electronic components
  "5734": "equipment", // Computer stores
  "5251": "equipment", // Hardware stores
  "7629": "equipment", // Electrical / appliance repair

  // Professional Services
  "7399": "professional-services", // Business services
  "8931": "professional-services", // Accounting / auditing
  "8111": "professional-services", // Legal services
  "7389": "professional-services", // Consulting / misc business
  "8049": "professional-services", // Offices of other health practitioners
  "8099": "professional-services", // Health services (non-physician)

  // Marketing & Advertising
  "7311": "marketing-ads", // Advertising services
  "2741": "marketing-ads", // Printing / publishing

  // Insurance
  "6300": "insurance", // Insurance premiums (generic)
  "6381": "insurance", // Insurance premiums
  "6399": "insurance", // Insurance (other)

  // Office Supplies
  "5112": "office-supplies", // Stationery / office supplies
  "5044": "office-supplies", // Photo / photography
  "5940": "office-supplies", // Sports stores (office equipment)

  // Subscriptions
  "5968": "subscriptions", // Direct marketing — continuity / subscription
  "7841": "subscriptions", // Video entertainment / streaming
  "5735": "subscriptions", // Music stores / streaming

  // Loans
  "6012": "loan-payments", // Financial institutions (loan payments)
  "6051": "loan-payments", // Non-financial institutions (advance)
}

/**
 * proprietaryBankTransactionCode → Polso slug (70% confidence)
 * Bank-specific strings — common patterns across Spanish and EU banks.
 */
const PROPRIETARY_CODE_TO_POLSO: Record<string, string> = {
  // Transfers (too generic for specific category — use miscellaneous)
  transfer: "miscellaneous",
  transferencia: "miscellaneous",
  traspaso: "miscellaneous",

  // Card purchases
  "card purchase": "miscellaneous",
  "compra con tarjeta": "miscellaneous",

  // Direct debits (recurring = subscription candidate, but we don't know enough)
  "direct debit": "miscellaneous",
  domiciliacion: "subscriptions",
  recibo: "subscriptions",

  // Payroll / salary
  payroll: "salaries-payroll",
  nomina: "salaries-payroll",
  salary: "salaries-payroll",

  // ATM
  "card atm": "miscellaneous",
  cajero: "miscellaneous",

  // Incoming foreign payment = likely income, skip category
}

/**
 * Map GoCardless transaction signals to a Polso category slug.
 *
 * @param mcc  merchantCategoryCode from GoCardless transaction
 * @param proprietaryCode  proprietaryBankTransactionCode from GoCardless
 */
export function mapGoCardlessToPolsoCategory(
  mcc: string | null | undefined,
  proprietaryCode: string | null | undefined
): { slug: string; confidence: number } | null {
  // MCC is most reliable — card transactions only
  if (mcc) {
    const slug = MCC_TO_POLSO[mcc]
    if (slug) return { slug, confidence: 0.85 }
  }

  // Proprietary code — lower confidence, bank-specific
  if (proprietaryCode) {
    const normalized = proprietaryCode.toLowerCase().trim()
    for (const [pattern, slug] of Object.entries(PROPRIETARY_CODE_TO_POLSO)) {
      if (normalized.includes(pattern)) {
        return { slug, confidence: 0.7 }
      }
    }
  }

  return null
}
