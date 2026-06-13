import { jaccardSimilarity } from "@polso/matching"
import { isGovKey } from "@polso/banking"
import type { CounterpartyWithStats } from "../queries/get-counterparties"

export interface MergeSuggestionGroup {
  key: string
  counterparties: CounterpartyWithStats[]
  totalEntries: number
  /** 0–1; (minPairwiseJaccard − 0.5) / 0.5. 0 = borderline, 1 = near-identical. */
  confidence: number
  /** Brand tokens shared by every member (what makes them a candidate group). */
  sharedTokens: string[]
}

// SUGGEST-only threshold. Identical keys are already auto-merged at ingestion
// (the unique constraint), so this only ever fires on similar-but-distinct keys.
const SIMILARITY_THRESHOLD = 0.5

/**
 * Surface likely-duplicate counterparties for HUMAN review. Never auto-applies.
 *
 * Operates on the clean `normalizedName` matchKey (plain token split — no second
 * normalization pass). Government rows are excluded. Grouping is clique-based
 * (every member is pairwise-similar to every other) to avoid greedy transitive
 * over-merging.
 */
export function computeMergeSuggestions(counterparties: CounterpartyWithStats[]): MergeSuggestionGroup[] {
  const tokensById = new Map<string, string[]>()
  const tokensOf = (cp: CounterpartyWithStats): string[] => {
    if (!tokensById.has(cp.id)) {
      const toks = isGovKey(cp.normalizedName)
        ? []
        : cp.normalizedName.split(" ").filter((t) => t.length > 1)
      tokensById.set(cp.id, toks)
    }
    return tokensById.get(cp.id)!
  }

  // Candidates: have entries and at least one brand token (excludes gov + empty keys).
  const active = counterparties
    .filter((cp) => cp._count.entries > 0 && tokensOf(cp).length > 0)
    .sort((a, b) => b._count.entries - a._count.entries)

  const simCache = new Map<string, number>()
  const sim = (a: CounterpartyWithStats, b: CounterpartyWithStats): number => {
    const cacheKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    let s = simCache.get(cacheKey)
    if (s === undefined) {
      const ta = tokensOf(a)
      const tb = tokensOf(b)
      // Brand-anchored blocking: require at least one shared token.
      const shares = ta.some((t) => tb.includes(t))
      s = shares ? jaccardSimilarity(ta, tb) : 0
      simCache.set(cacheKey, s)
    }
    return s
  }

  const visited = new Set<string>()
  const groups: MergeSuggestionGroup[] = []

  for (const anchor of active) {
    if (visited.has(anchor.id)) continue

    const group: CounterpartyWithStats[] = [anchor]
    for (const cand of active) {
      if (visited.has(cand.id) || cand.id === anchor.id) continue
      // Clique requirement: candidate must clear the threshold against EVERY member.
      if (group.every((m) => sim(m, cand) >= SIMILARITY_THRESHOLD)) {
        group.push(cand)
      }
    }

    // Mark every considered member visited (singletons too — they have no partners).
    for (const m of group) visited.add(m.id)
    if (group.length < 2) continue

    // Confidence = worst pairwise similarity in the group, mapped onto [0,1].
    let minSim = 1
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) minSim = Math.min(minSim, sim(group[i], group[j]))
    }
    const confidence = Math.max(0, Math.min(1, (minSim - SIMILARITY_THRESHOLD) / (1 - SIMILARITY_THRESHOLD)))

    const sharedTokens = tokensOf(group[0]).filter((t) => group.every((m) => tokensOf(m).includes(t)))
    const sorted = [...group].sort((a, b) => b._count.entries - a._count.entries)

    groups.push({
      key: sorted[0].normalizedName,
      counterparties: sorted,
      totalEntries: group.reduce((sum, cp) => sum + cp._count.entries, 0),
      confidence,
      sharedTokens,
    })
  }

  // Highest-confidence first, then by volume.
  return groups.sort((a, b) => b.confidence - a.confidence || b.totalEntries - a.totalEntries)
}
