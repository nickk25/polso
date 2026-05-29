/**
 * Provider-agnostic types for @polso/banking
 * All consumers use these types regardless of the underlying bank data provider.
 */

// ============================================
// Config
// ============================================

export interface BankingConfig {
  secretId: string
  secretKey: string
  redirectUri: string
}

// ============================================
// Account
// ============================================

export interface BankAccount {
  externalAccountId: string
  name: string
  /** Last 4 digits of IBAN or account number */
  mask: string | null
  /** depository, credit, loan, investment */
  type: string
  /** checking, savings, credit card, etc. */
  subtype: string | null
  currency: string
  balanceAvailable: number | null
  balanceCurrent: number | null
  balanceLimit: number | null
  iban: string | null
  bic: string | null
  /** Days until consent expires */
  expiresAt: string | null
}

// ============================================
// Transaction
// ============================================

/**
 * Normalized bank transaction.
 *
 * Amount sign convention:
 *   positive = money leaving account (expense / debit)
 *   negative = money coming in (income / credit)
 *
 * GoCardless raw amounts use the opposite sign and are negated before
 * creating a BankTransaction.
 */
export interface BankTransaction {
  externalTransactionId: string
  externalAccountId: string
  /** Positive = expense, negative = income */
  amount: number
  currency: string
  date: Date
  authorizedDate: Date | null
  /** Raw transaction name from bank */
  name: string | null
  /** Cleaned merchant/counterparty name */
  merchantName: string | null
  pending: boolean
  /** online, in_store, other */
  paymentChannel: string | null
  /** debit | credit */
  transactionType: "debit" | "credit"
  /** Provider's primary category string */
  category: string | null
  /** Provider's detailed category string */
  categoryDetailed: string | null
}

// ============================================
// Sync Result
// ============================================

export interface TransactionsFetchResult {
  transactions: BankTransaction[]
  /** Always null for GoCardless (no pagination); kept for interface compatibility */
  nextPageToken: string | null
}

// ============================================
// Provider (Institution)
// ============================================

export interface BankProvider {
  id: string
  name: string
  displayName: string | null
  logoUrl: string | null
  /** ISO 3166-1 alpha-2 country codes */
  countries: string[]
  /** Max days of transaction history available */
  maxHistoricalDays: number | null
}

// ============================================
// GoCardless raw API types
// ============================================

export type RequisitionStatus =
  | "CR" // Creation in progress
  | "GC" // GoCardless processing
  | "UA" // User action required
  | "RJ" // Rejected
  | "SA" // Suspended
  | "GA" // Granted access
  | "LN" // Linked (successfully connected)
  | "EX" // Expired

export interface GCRequisition {
  id: string
  created: string
  redirect: string
  status: RequisitionStatus
  institution_id: string
  agreement: string
  reference: string
  accounts: string[]
  link: string
  account_selection: boolean
  redirect_immediate: boolean
}

export interface GCTokenResponse {
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}

export interface GCInstitution {
  id: string
  name: string
  bic: string
  transaction_total_days: string
  logo: string
  countries: string[]
  separate_continuous_history_consent?: boolean
}

export interface GCAgreement {
  id: string
  created: string
  institution_id: string
  max_historical_days: number
  access_valid_for_days: number
  access_scope: string[]
  accepted: boolean
}

export interface GCAccountBalance {
  balanceAmount: {
    amount: string
    currency: string
  }
  balanceType:
    | "interimAvailable"
    | "interimBooked"
    | "expected"
    | "closingAvailable"
    | "closingBooked"
    | "closingCleared"
    | "forwardAvailable"
    | "interimCleared"
    | "information"
    | "nonInvoiced"
    | "openingBooked"
    | "openingAvailable"
    | "openingCleared"
    | "previouslyClosedBooked"
  creditLimitIncluded: boolean
}

export interface GCRawTransaction {
  transactionAmount: { amount: string; currency: string }
  currencyExchange?: {
    exchangeRate: string
    targetCurrency: string
    sourceCurrency: string
  }[]
  remittanceInformationStructured?: string
  remittanceInformationStructuredArray?: string[]
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray?: string[]
  proprietaryBankTransactionCode?: string
  bankTransactionCode?: string
  merchantCategoryCode?: string
  entryReference?: string
  transactionId?: string
  internalTransactionId: string
  bookingDate: string
  valueDate?: string
  additionalInformation?: string
  creditorName?: string
  creditorAccount?: { iban?: string }
  debtorName?: string
  debtorAccount?: { iban?: string }
  balanceAfterTransaction?: {
    balanceAmount?: { amount: string; currency?: string }
  }
}

export interface GCAccountDetails {
  id: string
  created: string
  last_accessed: string
  iban?: string
  institution_id: string
  status: string
  owner_name?: string
  account: {
    resourceId: string
    iban?: string
    currency: string
    ownerName?: string
    name?: string
    product?: string
    cashAccountType?: string
    bban?: string
    bic?: string
  }
}
