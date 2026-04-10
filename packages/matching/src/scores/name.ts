import {
  tokenize,
  jaccardSimilarity,
  substringMatch,
  normalizeCif,
} from "../normalizers"

/**
 * Score how well two vendor names match.
 *
 * Priority:
 * 1. CIF match → 1.0 (definitive)
 * 2. Jaccard token overlap + substring containment
 */
export function scoreName(
  transactionName: string | null,
  inboxDisplayName: string | null,
  transactionCif?: string | null,
  inboxCif?: string | null
): number {
  // CIF match is definitive
  const tCif = normalizeCif(transactionCif)
  const iCif = normalizeCif(inboxCif)
  if (tCif && iCif && tCif === iCif) return 1.0

  if (!transactionName && !inboxDisplayName) return 0
  if (!transactionName || !inboxDisplayName) return 0

  const tTokens = tokenize(transactionName)
  const iTokens = tokenize(inboxDisplayName)

  const jaccard = jaccardSimilarity(tTokens, iTokens)
  const substring = substringMatch(transactionName, inboxDisplayName) ? 0.2 : 0

  // Combine: jaccard is primary, substring containment is a bonus
  return Math.min(1.0, jaccard + substring)
}
