/**
 * Recurring Pattern Detection Algorithm
 *
 * Detects subscriptions and fixed expenses by analyzing:
 * - Transaction frequency (weekly, biweekly, monthly, quarterly, yearly)
 * - Amount consistency (within variance threshold)
 * - Vendor/counterparty patterns
 */

import type { Expense, Vendor } from "@polso/db"

export interface DetectedPattern {
  name: string
  vendorId: string | null
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
  expectedAmount: number
  amountVariancePct: number
  expectedDayOfMonth: number | null
  categoryId: string | null
  confidenceScore: number
  firstOccurrence: Date
  lastOccurrence: Date
  occurrenceCount: number
  expenseIds: string[]
}

interface ExpenseWithVendor extends Expense {
  vendor?: Vendor | null
}

// Minimum occurrences needed to detect a pattern
const MIN_OCCURRENCES = 2

// Day tolerance for matching (e.g., payment on 15th vs 17th)
const DAY_TOLERANCE = 5

// Amount variance threshold (percentage)
const DEFAULT_AMOUNT_VARIANCE = 15

/**
 * Detect recurring patterns from a list of expenses
 */
export function detectRecurringPatterns(
  expenses: ExpenseWithVendor[]
): DetectedPattern[] {
  // Group expenses by vendor/counterparty
  const grouped = groupExpensesByVendor(expenses)

  const patterns: DetectedPattern[] = []

  for (const [key, group] of grouped.entries()) {
    if (group.length < MIN_OCCURRENCES) continue

    // Sort by date
    const sorted = group.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Analyze the group for patterns
    const pattern = analyzeGroup(key, sorted)
    if (pattern) {
      patterns.push(pattern)
    }
  }

  // Sort by confidence score
  return patterns.sort((a, b) => b.confidenceScore - a.confidenceScore)
}

/**
 * Group expenses by vendor or normalized description
 */
function groupExpensesByVendor(
  expenses: ExpenseWithVendor[]
): Map<string, ExpenseWithVendor[]> {
  const groups = new Map<string, ExpenseWithVendor[]>()

  for (const expense of expenses) {
    // Skip excluded expenses
    if (expense.status === "excluded") continue

    // Use vendor name or description as key
    const key = expense.vendor?.normalizedName ||
      expense.description?.toLowerCase().trim() ||
      "unknown"

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(expense)
  }

  return groups
}

/**
 * Analyze a group of expenses for recurring patterns
 */
function analyzeGroup(
  key: string,
  expenses: ExpenseWithVendor[]
): DetectedPattern | null {
  if (expenses.length < MIN_OCCURRENCES) return null

  // Calculate intervals between transactions (in days)
  const intervals: number[] = []
  for (let i = 1; i < expenses.length; i++) {
    const prev = new Date(expenses[i - 1].date)
    const curr = new Date(expenses[i].date)
    const daysDiff = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    )
    intervals.push(daysDiff)
  }

  if (intervals.length === 0) return null

  // Detect frequency from intervals
  const frequency = detectFrequency(intervals)
  if (!frequency) return null

  // Calculate amount statistics
  const amounts = expenses.map((e) => e.amount)
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const amountVariance = calculateVariance(amounts, avgAmount)

  // Check if amounts are consistent enough
  if (amountVariance > DEFAULT_AMOUNT_VARIANCE * 2) return null

  // Calculate expected day of month for monthly+ patterns
  const expectedDayOfMonth = calculateExpectedDay(expenses, frequency)

  // Calculate confidence score
  const confidenceScore = calculateConfidence(
    intervals,
    frequency,
    amountVariance,
    expenses.length
  )

  // Need minimum confidence
  if (confidenceScore < 0.5) return null

  const firstExpense = expenses[0]
  const lastExpense = expenses[expenses.length - 1]

  return {
    name: firstExpense.vendor?.name || firstExpense.description || key,
    vendorId: firstExpense.vendorId,
    frequency,
    expectedAmount: Math.round(avgAmount * 100) / 100,
    amountVariancePct: Math.round(amountVariance * 100) / 100,
    expectedDayOfMonth,
    categoryId: firstExpense.categoryId,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    firstOccurrence: new Date(firstExpense.date),
    lastOccurrence: new Date(lastExpense.date),
    occurrenceCount: expenses.length,
    expenseIds: expenses.map((e) => e.id),
  }
}

/**
 * Detect frequency from intervals
 */
function detectFrequency(
  intervals: number[]
): "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | null {
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

  // Weekly: ~7 days
  if (avgInterval >= 5 && avgInterval <= 10) {
    return "weekly"
  }

  // Biweekly: ~14 days
  if (avgInterval >= 12 && avgInterval <= 18) {
    return "biweekly"
  }

  // Monthly: ~30 days
  if (avgInterval >= 25 && avgInterval <= 38) {
    return "monthly"
  }

  // Quarterly: ~90 days
  if (avgInterval >= 80 && avgInterval <= 100) {
    return "quarterly"
  }

  // Yearly: ~365 days
  if (avgInterval >= 350 && avgInterval <= 380) {
    return "yearly"
  }

  return null
}

/**
 * Calculate percentage variance of amounts
 */
function calculateVariance(amounts: number[], average: number): number {
  if (average === 0) return 100

  const maxDeviation = Math.max(
    ...amounts.map((a) => Math.abs(a - average))
  )

  return (maxDeviation / average) * 100
}

/**
 * Calculate expected day of month
 */
function calculateExpectedDay(
  expenses: ExpenseWithVendor[],
  frequency: string
): number | null {
  if (frequency === "weekly" || frequency === "biweekly") {
    return null
  }

  const days = expenses.map((e) => new Date(e.date).getDate())
  const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length)

  // Check if days are consistent within tolerance
  const consistent = days.every(
    (d) => Math.abs(d - avgDay) <= DAY_TOLERANCE ||
           Math.abs(d - avgDay + 30) <= DAY_TOLERANCE || // Handle month wrap
           Math.abs(d - avgDay - 30) <= DAY_TOLERANCE
  )

  return consistent ? avgDay : null
}

/**
 * Calculate confidence score (0-1)
 */
function calculateConfidence(
  intervals: number[],
  frequency: string,
  amountVariance: number,
  occurrenceCount: number
): number {
  let score = 0

  // Expected interval based on frequency
  const expectedInterval = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  }[frequency] || 30

  // Interval consistency (40% weight)
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const intervalDeviation = Math.abs(avgInterval - expectedInterval) / expectedInterval
  const intervalScore = Math.max(0, 1 - intervalDeviation)
  score += intervalScore * 0.4

  // Amount consistency (30% weight)
  const amountScore = Math.max(0, 1 - amountVariance / 100)
  score += amountScore * 0.3

  // Occurrence count (20% weight) - more occurrences = higher confidence
  const occurrenceScore = Math.min(1, occurrenceCount / 6) // Max out at 6 occurrences
  score += occurrenceScore * 0.2

  // Interval regularity (10% weight) - check if intervals are consistent
  const intervalVariance = calculateIntervalVariance(intervals, expectedInterval)
  const regularityScore = Math.max(0, 1 - intervalVariance / expectedInterval)
  score += regularityScore * 0.1

  return score
}

/**
 * Calculate variance of intervals from expected
 */
function calculateIntervalVariance(
  intervals: number[],
  expected: number
): number {
  const deviations = intervals.map((i) => Math.abs(i - expected))
  return deviations.reduce((a, b) => a + b, 0) / deviations.length
}
