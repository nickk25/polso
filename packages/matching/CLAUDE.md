# packages/matching — @polso/matching

Receipt↔transaction matching algorithm. Spanish-adapted scoring.

## What it exports

```typescript
// Core matching
scoreCandidate(candidate, weights?, thresholds?)  // → MatchResult | null
findBestMatches(candidates, weights?, thresholds?) // → MatchResult[]
calibrateThresholds(samples, current?)             // → CalibrationResult

// Normalizers
normalizeName(name)       // strip bank prefixes, S.L., S.A., punctuation, lowercase
tokenize(name)            // → string[] tokens
jaccardSimilarity(a, b)   // token set overlap 0–1
normalizeCif(cif)         // strip non-alphanum, uppercase

// Types
MatchCandidate, MatchResult, MatchType, ScoreBreakdown
ScoringWeights, CalibrationResult, CalibrationSample

// Constants
DEFAULT_WEIGHTS     // { amount: 0.30, date: 0.15, name: 0.10, currency: 0.05 }
DEFAULT_THRESHOLDS  // { autoMatch: 0.95, highConfidence: 0.75, suggested: 0.50 }
```

## Scoring weights

| Score | Weight | Notes |
|-------|--------|-------|
| amount | 30% | IVA-aware: detects 21%, 10%, 4% variants |
| date | 15% | Same-day 1.0, ≤90 days linear decay |
| name | 10% | CIF match → 1.0; else Jaccard + substring |
| currency | 5% | EUR/EUR → 1.0, mismatch → 0.3 |

## Match types

| Type | Threshold | Meaning |
|------|-----------|---------|
| `auto_matched` | ≥0.95 | Confirm automatically without user review |
| `high_confidence` | ≥0.75 | Show with strong visual indicator |
| `suggested` | ≥0.50 | Show as a suggestion for user review |

## Spanish adaptations

- IVA rates: 21% (general), 10% (reducido), 4% (superreducido) — prioritized over generic EU rates
- Legal suffixes: S.L., S.A., S.L.U., S.C. stripped during normalization
- CIF matching: exact CIF/NIF match scores 1.0 on name — overrides all other name logic
- Bank transaction name rewrites (applied before general normalization):
  - `AMZN MKTP ES*...` → `amazon`
  - `PAYPAL *Vendor` → `Vendor`
  - `BIZUM DE/A Name` → `Name`
  - `COMPRA EN/CARGO/TRF INMEDIATA/RECIBO DE ...` → strips the prefix

## Date window

`runMatchingForItem` in `@polso/inbox` queries **all** open transactions (no date filter). The date score decays to 0.0 beyond 90 days, so old transactions score low but are not excluded. Both `matchAfterSync` and the manual `runMatchingAction` in the partner app use the same approach.

## Calibration

- Min 3 samples to adjust suggested/high-confidence thresholds
- Min 5 samples to adjust auto-match threshold
- Max 3% adjustment per calibration run
