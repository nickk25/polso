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
