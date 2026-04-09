/**
 * Provider-agnostic types for @polso/banking
 * All consumers use these types regardless of the underlying bank data provider.
 */

// ============================================
// Config
// ============================================

export interface TinkConfig {
  clientId: string
  clientSecret: string
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
}

// ============================================
// Transaction
// ============================================

/**
 * Normalized bank transaction.
 *
 * Amount sign convention (same as Plaid/Polso):
 *   positive = money leaving account (expense / debit)
 *   negative = money coming in (income / credit)
 *
 * Tink raw amounts use the opposite sign and must be negated before
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
  /** Pass as pageToken to the next call; null when no more pages */
  nextPageToken: string | null
}

// ============================================
// Token Exchange Result
// ============================================

export interface TinkTokenResult {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  /** Tink credential ID — groups all accounts from one bank connection */
  credentialId: string
}

// ============================================
// Provider (Institution)
// ============================================

export interface BankProvider {
  id: string
  name: string
  displayName: string | null
  logoUrl: string | null
}
