/**
 * Shared utilities for the banking package.
 */

import type { GCAccountBalance } from "./types"

// Balance type priority tiers — from Midday's balance selection logic
const BALANCE_TIERS = [
  ["interimBooked"],
  ["closingBooked"],
  ["interimAvailable"],
  ["expected"],
] as const

/**
 * Select the most relevant balance from a list, using the priority tier order.
 * Prefers balances matching the account's currency when provided.
 */
export function selectPrimaryBalance(
  balances: GCAccountBalance[] | undefined,
  preferredCurrency?: string
): GCAccountBalance | undefined {
  if (!balances?.length) return undefined

  const matchesCurrency = (b: GCAccountBalance) =>
    !preferredCurrency ||
    b.balanceAmount.currency.toUpperCase() === preferredCurrency.toUpperCase()

  for (const tier of BALANCE_TIERS) {
    const type = tier[0]
    const match =
      balances.find((b) => b.balanceType === type && matchesCurrency(b)) ??
      balances.find((b) => b.balanceType === type)
    if (match) return match
  }

  return balances[0]
}

/**
 * Select the available (spendable) balance — separate from the booked/current balance.
 * Priority: interimAvailable > expected
 */
export function getAvailableBalance(
  balances: GCAccountBalance[] | undefined,
  preferredCurrency?: string
): number | null {
  if (!balances?.length) return null

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

/**
 * Map ISO 20022 cashAccountType code to Polso account type + subtype.
 */
export function mapCashAccountType(cashAccountType?: string): {
  accountType: string
  accountSubtype: string | null
} {
  switch (cashAccountType) {
    case "CACC":
    case "CASH":
    case "SACC":
    case "TRAN":
    case "SLRY":
    case "TRAS":
      return { accountType: "depository", accountSubtype: "checking" }
    case "SVGS":
    case "MOMA":
    case "LLSV":
      return { accountType: "depository", accountSubtype: "savings" }
    case "CARD":
      return { accountType: "credit", accountSubtype: null }
    case "LOAN":
    case "ODFT":
    case "MORT":
      return { accountType: "loan", accountSubtype: null }
    default:
      return { accountType: "depository", accountSubtype: null }
  }
}

// Restricted institutions where max_historical_days must be capped at 90
// https://bankaccountdata.zendesk.com/hc/en-gb/articles/11529718632476
const RESTRICTED_INSTITUTIONS = new Set([
  "BRED_BREDFRPP",
  "SWEDBANK_SWEDSESS",
  "LABORALKUTXA_CLPEES2M",
  "BANKINTER_BKBKESMM",
  "CAIXABANK_CAIXESBB",
  "SANTANDER_DE_SCFBDE33",
  "BBVA_BBVAESMM",
])

export function getMaxHistoricalDays({
  transactionTotalDays,
  institutionId,
  separateContinuousHistoryConsent,
}: {
  transactionTotalDays: number
  institutionId: string
  separateContinuousHistoryConsent?: boolean
}): number {
  if (separateContinuousHistoryConsent || RESTRICTED_INSTITUTIONS.has(institutionId)) {
    return 90
  }
  return transactionTotalDays
}
