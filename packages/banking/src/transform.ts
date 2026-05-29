/**
 * GoCardless → Polso data transformers.
 * Modelled after Midday's transform.ts with Polso sign convention:
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
import { selectPrimaryBalance } from "./utils"

// ============================================
// Transaction name — priority chain from Midday
// ============================================

function transformTransactionName(transaction: GCRawTransaction): string {
  if (transaction.creditorName) return toTitleCase(transaction.creditorName)
  if (transaction.debtorName) return toTitleCase(transaction.debtorName)
  if (transaction.additionalInformation) return toTitleCase(transaction.additionalInformation)
  if (transaction.remittanceInformationStructured) {
    return toTitleCase(transaction.remittanceInformationStructured)
  }
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

function transformCounterpartyName(transaction: GCRawTransaction): string | null {
  if (transaction.debtorName) return toTitleCase(transaction.debtorName)
  if (transaction.creditorName) return toTitleCase(transaction.creditorName)
  return null
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
  const counterpartyName = transformCounterpartyName(transaction)

  // GoCardless: negative = expense (money out), positive = income (money in)
  // Polso convention is opposite — negate to match
  const rawAmount = parseFloat(transaction.transactionAmount.amount)
  const amount = -rawAmount

  const transactionType: "debit" | "credit" = amount > 0 ? "debit" : "credit"

  const date = new Date(transaction.bookingDate)
  const authorizedDate = transaction.valueDate ? new Date(transaction.valueDate) : null

  return {
    externalTransactionId: transaction.internalTransactionId,
    externalAccountId: accountId,
    amount,
    currency: transaction.transactionAmount.currency,
    date,
    authorizedDate,
    name: description ?? name,
    merchantName: counterpartyName ?? name,
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

  const availableBalance = getAvailableBalance(balances, currency)

  const iban = details?.iban ?? account?.iban ?? null
  const mask = iban && iban.length >= 4 ? iban.slice(-4) : null

  const accountType = getAccountType(account?.cashAccountType)

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
    subtype: null,
    currency,
    balanceAvailable: availableBalance,
    balanceCurrent,
    balanceLimit: null,
    iban,
    bic: institution?.bic ?? account?.bic ?? null,
    expiresAt: null, // set by the caller from agreement.access_valid_for_days
  }
}

// ============================================
// Balance helpers — from Midday's utils.ts
// ============================================

function getAccountType(cashAccountType?: string): string {
  switch (cashAccountType) {
    case "CARD":
      return "credit"
    case "LOAN":
      return "loan"
    default:
      return "depository"
  }
}

function resolveCurrency(...candidates: (string | undefined)[]): string {
  const valid = candidates.find((c) => c && /^[A-Z]{3}$/.test(c))
  return valid?.toUpperCase() ?? "EUR"
}

function getAvailableBalance(
  balances: GCAccountBalance[],
  preferredCurrency?: string
): number | null {
  if (!balances.length) return null

  const matchesCurrency = (b: GCAccountBalance) =>
    !preferredCurrency ||
    b.balanceAmount.currency.toUpperCase() === preferredCurrency.toUpperCase()

  const interimAvailable =
    balances.find((b) => b.balanceType === "interimAvailable" && matchesCurrency(b)) ??
    balances.find((b) => b.balanceType === "interimAvailable")

  if (interimAvailable) return parseFloat(interimAvailable.balanceAmount.amount)

  const expected =
    balances.find((b) => b.balanceType === "expected" && matchesCurrency(b)) ??
    balances.find((b) => b.balanceType === "expected")

  if (expected) return parseFloat(expected.balanceAmount.amount)

  return null
}
