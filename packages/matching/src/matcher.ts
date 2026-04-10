import { scoreAmount } from "./scores/amount"
import { scoreDate } from "./scores/date"
import { scoreName } from "./scores/name"
import { scoreCurrency } from "./scores/currency"
import {
  MatchCandidate,
  MatchResult,
  MatchType,
  ScoreBreakdown,
  ScoringWeights,
  DEFAULT_WEIGHTS,
  CalibrationResult,
  DEFAULT_THRESHOLDS,
} from "./types"

function computeScores(
  candidate: MatchCandidate,
  weights: ScoringWeights
): ScoreBreakdown {
  const amountScore = scoreAmount(candidate.transactionAmount, candidate.inboxAmount)
  const dateScore = scoreDate(candidate.transactionDate, candidate.inboxDate)
  const nameScore = scoreName(
    candidate.transactionName,
    candidate.inboxDisplayName,
    undefined,
    candidate.inboxCif
  )
  const currencyScore = scoreCurrency(
    candidate.transactionCurrency,
    candidate.inboxCurrency
  )

  const confidenceScore =
    amountScore * weights.amount +
    dateScore * weights.date +
    nameScore * weights.name +
    currencyScore * weights.currency

  return { amountScore, dateScore, nameScore, currencyScore, confidenceScore }
}

function classifyMatch(
  score: number,
  thresholds: CalibrationResult
): MatchType | null {
  if (score >= thresholds.autoMatchThreshold) return "auto_matched"
  if (score >= thresholds.highConfidenceThreshold) return "high_confidence"
  if (score >= thresholds.suggestedThreshold) return "suggested"
  return null
}

/**
 * Score a single candidate pair.
 * Returns null if the score is below the suggested threshold.
 */
export function scoreCandidate(
  candidate: MatchCandidate,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  thresholds: CalibrationResult = DEFAULT_THRESHOLDS
): MatchResult | null {
  const scores = computeScores(candidate, weights)
  const matchType = classifyMatch(scores.confidenceScore, thresholds)

  if (!matchType) return null

  return {
    transactionId: candidate.transactionId,
    inboxItemId: candidate.inboxItemId,
    scores,
    matchType,
    matchDetails: {
      weights,
      thresholds,
    },
  }
}

/**
 * Find the best match for each inbox item from a list of candidates.
 * Returns one result per inboxItemId (the highest-scoring match).
 */
export function findBestMatches(
  candidates: MatchCandidate[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  thresholds: CalibrationResult = DEFAULT_THRESHOLDS
): MatchResult[] {
  const scored = candidates
    .map((c) => scoreCandidate(c, weights, thresholds))
    .filter((r): r is MatchResult => r !== null)

  // Group by inboxItemId, keep best score per item
  const best = new Map<string, MatchResult>()
  for (const result of scored) {
    const existing = best.get(result.inboxItemId)
    if (!existing || result.scores.confidenceScore > existing.scores.confidenceScore) {
      best.set(result.inboxItemId, result)
    }
  }

  return [...best.values()]
}

/**
 * Calibrate thresholds from historical confirmed/declined samples.
 * Requires min 5 samples for auto-match, 3 for high-confidence.
 * Max 3% adjustment per calibration run.
 */
export function calibrateThresholds(
  samples: Array<{ confirmed: boolean; score: number }>,
  current: CalibrationResult = DEFAULT_THRESHOLDS
): CalibrationResult {
  const confirmed = samples.filter((s) => s.confirmed).map((s) => s.score)
  const declined = samples.filter((s) => !s.confirmed).map((s) => s.score)

  if (confirmed.length < 3) return current

  const maxDeclined = declined.length > 0 ? Math.max(...declined) : 0
  const minConfirmed = Math.min(...confirmed)

  const MAX_ADJUSTMENT = 0.03

  // Suggested threshold: just above the max declined score
  const rawSuggested = maxDeclined + 0.01
  const newSuggested = clamp(
    rawSuggested,
    current.suggestedThreshold - MAX_ADJUSTMENT,
    current.suggestedThreshold + MAX_ADJUSTMENT
  )

  // High confidence: midpoint between suggested and auto-match
  const newHighConfidence = clamp(
    (newSuggested + current.autoMatchThreshold) / 2,
    current.highConfidenceThreshold - MAX_ADJUSTMENT,
    current.highConfidenceThreshold + MAX_ADJUSTMENT
  )

  // Auto-match: just above the min confirmed score (if we have 5+ samples)
  const newAutoMatch =
    confirmed.length >= 5
      ? clamp(
          minConfirmed - 0.01,
          current.autoMatchThreshold - MAX_ADJUSTMENT,
          current.autoMatchThreshold + MAX_ADJUSTMENT
        )
      : current.autoMatchThreshold

  return {
    suggestedThreshold: newSuggested,
    highConfidenceThreshold: newHighConfidence,
    autoMatchThreshold: newAutoMatch,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
