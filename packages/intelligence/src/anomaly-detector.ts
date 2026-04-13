export interface AnomalyInput {
  id: string
  amount: number
  description: string | null
  categoryId: string
  categoryName: string | null
  categoryAvg: number    // pre-fetched 90-day average for this category
  categoryCount: number  // number of data points used to compute the average
}

export interface DetectedAnomaly {
  expenseId: string
  description: string
  amount: number
  categoryName: string
  categoryAvg: number
}

/**
 * Pure anomaly detection — identify expenses that exceed the category's
 * historical average by the given multiplier.
 *
 * No DB access, no side effects. Callers are responsible for pre-fetching
 * category averages and passing them in via AnomalyInput.
 */
export function detectAnomalies(
  expenses: AnomalyInput[],
  options?: { multiplier?: number; minDataPoints?: number; limit?: number }
): DetectedAnomaly[] {
  const { multiplier = 2, minDataPoints = 3, limit = Infinity } = options ?? {}
  const results: DetectedAnomaly[] = []

  for (const expense of expenses) {
    if (results.length >= limit) break
    if (expense.categoryCount < minDataPoints) continue
    if (expense.amount < expense.categoryAvg * multiplier) continue

    results.push({
      expenseId: expense.id,
      description: expense.description ?? expense.categoryName ?? "Unknown",
      amount: expense.amount,
      categoryName: expense.categoryName ?? "Unknown",
      categoryAvg: expense.categoryAvg,
    })
  }

  return results
}
