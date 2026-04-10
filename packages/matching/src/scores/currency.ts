/**
 * Score currency match.
 * Almost everything is EUR in Spain, so this is a simple check.
 */
export function scoreCurrency(
  transactionCurrency: string,
  inboxCurrency: string
): number {
  return transactionCurrency.toUpperCase() === inboxCurrency.toUpperCase()
    ? 1.0
    : 0.3
}
