export { scoreCandidate, findBestMatches, calibrateThresholds } from "./matcher"
export { normalizeName, tokenize, jaccardSimilarity, normalizeCif } from "./normalizers"
export type {
  MatchCandidate,
  MatchResult,
  MatchType,
  ScoreBreakdown,
  ScoringWeights,
  CalibrationResult,
  CalibrationSample,
} from "./types"
export { DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from "./types"
