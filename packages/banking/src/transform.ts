/**
 * GoCardless → Polso data transformers.
 * GoCardless → Polso sign convention:
 *   positive amount = expense (money out)
 *   negative amount = income (money in)
 */

import type {
  BankAccount,
  BankTransaction,
  GCRawTransaction,
  GCAccountDetails,
  GCAccountBalance,
  GCInstitution,
} from "./types"

import { selectPrimaryBalance, getAvailableBalance, mapCashAccountType } from "./utils"

// ============================================
// Transaction name — priority chain
// ============================================

function transformTransactionName(transaction: GCRawTransaction): string {
  if (transaction.creditorName) return toTitleCase(transaction.creditorName)
  if (transaction.debtorName) return toTitleCase(transaction.debtorName)
  // Structured remittance is cleaner than free-text additionalInformation — prefer it.
  if (transaction.remittanceInformationStructured) {
    return toTitleCase(transaction.remittanceInformationStructured)
  }
  const structuredArray = transaction.remittanceInformationStructuredArray?.at(0)
  if (structuredArray) return toTitleCase(structuredArray)
  if (transaction.additionalInformation) return toTitleCase(transaction.additionalInformation)
  if (transaction.remittanceInformationUnstructured) {
    return toTitleCase(transaction.remittanceInformationUnstructured)
  }
  const remittanceArray = transaction.remittanceInformationUnstructuredArray?.at(0)
  if (remittanceArray) return toTitleCase(remittanceArray)
  if (transaction.proprietaryBankTransactionCode) {
    return transaction.proprietaryBankTransactionCode
  }
  return "Unknown"
}

function transformDescription(
  transaction: GCRawTransaction,
  name: string
): string | null {
  if (transaction.remittanceInformationUnstructuredArray?.length) {
    const text = transaction.remittanceInformationUnstructuredArray.join(" ")
    const desc = toTitleCase(text)
    if (desc !== name) return desc
  }
  if (transaction.additionalInformation) {
    const desc = toTitleCase(transaction.additionalInformation)
    if (desc !== name) return desc
  }
  return null
}

/**
 * Structured payee name, if the bank provided one. `structured: true` lets the
 * canonicalizer skip its aggressive digit/noise stripping (a structured payee is
 * already clean). Returns `null` name for card-POS rows (no creditor/debtor name).
 */
function transformCounterpartyName(transaction: GCRawTransaction): {
  name: string | null
  structured: boolean
} {
  if (transaction.debtorName) return { name: toTitleCase(transaction.debtorName), structured: true }
  if (transaction.creditorName) return { name: toTitleCase(transaction.creditorName), structured: true }
  return { name: null, structured: false }
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
    .trim()
}

// ============================================
// Transaction transformer
// ============================================

export function transformTransaction({
  transaction,
  accountId,
  pending,
}: {
  transaction: GCRawTransaction
  accountId: string
  pending: boolean
}): BankTransaction {
  const name = transformTransactionName(transaction)
  const description = transformDescription(transaction, name)
  const counterparty = transformCounterpartyName(transaction)
  const counterpartyIban =
    transaction.creditorAccount?.iban ?? transaction.debtorAccount?.iban ?? null

  // GoCardless: negative = expense (money out), positive = income (money in)
  // Polso convention is opposite — negate to match
  const rawAmount = parseFloat(transaction.transactionAmount.amount)
  const amount = -rawAmount

  const transactionType: "debit" | "credit" = amount > 0 ? "debit" : "credit"

  const date = new Date(transaction.bookingDate)
  const authorizedDate = transaction.valueDate ? new Date(transaction.valueDate) : null

  // Prefer bank's own transactionId (stable across fetches) over GoCardless's
  // internalTransactionId which the API docs warn may vary between date ranges.
  // Fall back to a synthetic composite key so we never store a null ID.
  const externalTransactionId =
    transaction.transactionId?.trim() ||
    transaction.internalTransactionId?.trim() ||
    `${accountId}|${transaction.bookingDate}|${transaction.transactionAmount.amount}|${transaction.transactionAmount.currency}`

  return {
    externalTransactionId,
    externalAccountId: accountId,
    amount,
    currency: transaction.transactionAmount.currency,
    date,
    authorizedDate,
    name: description ?? name,
    merchantName: counterparty.name ?? name,
    nameIsStructured: counterparty.name != null,
    counterpartyIban,
    pending,
    paymentChannel: null,
    transactionType,
    category: transaction.proprietaryBankTransactionCode ?? null,
    categoryDetailed: transaction.merchantCategoryCode ?? null,
  }
}

// ============================================
// Account transformer
// ============================================

export function transformAccount({
  id,
  details,
  balances,
  institution,
}: {
  id: string
  details: GCAccountDetails | null
  balances: GCAccountBalance[]
  institution: GCInstitution | null
}): BankAccount {
  const account = details?.account
  const currency = resolveCurrency(
    account?.currency,
    ...balances.map((b) => b.balanceAmount.currency)
  )

  const primaryBalance = selectPrimaryBalance(balances, currency)
  const balanceCurrent = primaryBalance
    ? parseFloat(primaryBalance.balanceAmount.amount)
    : null

  const balanceAvailable = getAvailableBalance(balances, currency)

  const iban = details?.iban ?? account?.iban ?? null
  const mask = iban && iban.length >= 4 ? iban.slice(-4) : null

  const { accountType, accountSubtype } = mapCashAccountType(account?.cashAccountType)

  const name =
    account?.name ??
    account?.product ??
    account?.ownerName ??
    (institution ? `${institution.name} (${currency})` : "Bank Account")

  return {
    externalAccountId: id,
    name: toTitleCase(name),
    mask,
    type: accountType,
    subtype: accountSubtype,
    currency,
    balanceAvailable,
    balanceCurrent,
    balanceLimit: null,
    iban,
    bic: institution?.bic ?? account?.bic ?? null,
    expiresAt: null, // set by the caller from agreement.access_valid_for_days
  }
}

function resolveCurrency(...candidates: (string | undefined)[]): string {
  const valid = candidates.find((c) => c && /^[A-Z]{3}$/.test(c))
  return valid?.toUpperCase() ?? "EUR"
}
