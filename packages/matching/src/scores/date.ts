/**
 * Score how well two dates match.
 *
 * Scale:
 *   same day → 1.0
 *   ≤1 day   → 0.95
 *   ≤7 days  → 0.75
 *   ≤30 days → linear decay 0.75 → 0.30
 *   ≤90 days → linear decay 0.30 → 0.10  (invoices with payment terms)
 *   >90 days → 0
 */
export function scoreDate(
  transactionDate: Date,
  inboxDate: Date | null
): number {
  if (!inboxDate) return 0

  const diffMs = Math.abs(transactionDate.getTime() - inboxDate.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays === 0) return 1.0
  if (diffDays <= 1) return 0.95
  if (diffDays <= 7) return 0.75
  if (diffDays <= 30) {
    // linear: 0.75 at day 7 → 0.30 at day 30
    return 0.75 - ((diffDays - 7) / (30 - 7)) * (0.75 - 0.30)
  }
  if (diffDays <= 90) {
    // linear: 0.30 at day 30 → 0.10 at day 90
    return 0.30 - ((diffDays - 30) / (90 - 30)) * (0.30 - 0.10)
  }
  return 0
}
