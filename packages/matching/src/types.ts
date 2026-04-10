export interface MatchCandidate {
  transactionId: string
  transactionAmount: number
  transactionDate: Date
  transactionName: string | null
  transactionCurrency: string

  inboxItemId: string
  inboxAmount: number | null
  inboxDate: Date | null
  inboxDisplayName: string | null
  inboxCurrency: string
  inboxCif: string | null // Spanish vendor tax ID
}

export interface ScoringWeights {
  amount: number   // default 0.30
  date: number     // default 0.15
  name: number     // default 0.10
  currency: number // default 0.05
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  amount: 0.50,
  date: 0.25,
  name: 0.15,
  currency: 0.10,
}

export interface ScoreBreakdown {
  amountScore: number
  dateScore: number
  nameScore: number
  currencyScore: number
  confidenceScore: number // weighted total
}

export type MatchType = "auto_matched" | "high_confidence" | "suggested"

export interface MatchResult {
  transactionId: string
  inboxItemId: string
  scores: ScoreBreakdown
  matchType: MatchType
  matchDetails: Record<string, unknown>
}

// Calibration
export interface CalibrationSample {
  confirmedMatch: boolean
  scores: ScoreBreakdown
}

export interface CalibrationResult {
  autoMatchThreshold: number    // default 0.95
  highConfidenceThreshold: number // default 0.75
  suggestedThreshold: number    // default 0.50
}

export const DEFAULT_THRESHOLDS: CalibrationResult = {
  autoMatchThreshold: 0.95,
  highConfidenceThreshold: 0.75,
  suggestedThreshold: 0.50,
}
