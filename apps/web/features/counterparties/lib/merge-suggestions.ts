import { tokenize, jaccardSimilarity } from "@polso/matching"
import type { CounterpartyWithStats } from "../queries/get-counterparties"

export interface MergeSuggestionGroup {
  key: string
  counterparties: CounterpartyWithStats[]
  totalEntries: number
}

const JACCARD_THRESHOLD = 0.3

export function computeMergeSuggestions(counterparties: CounterpartyWithStats[]): MergeSuggestionGroup[] {
  const active = counterparties.filter(cp => cp._count.entries > 0)
  const tokenCache = new Map<string, string[]>()

  const getTokens = (cp: CounterpartyWithStats): string[] => {
    if (!tokenCache.has(cp.id)) tokenCache.set(cp.id, tokenize(cp.normalizedName))
    return tokenCache.get(cp.id)!
  }

  const visited = new Set<string>()
  const groups: MergeSuggestionGroup[] = []

  for (let i = 0; i < active.length; i++) {
    const anchor = active[i]
    if (visited.has(anchor.id)) continue

    const group: CounterpartyWithStats[] = [anchor]
    visited.add(anchor.id)

    for (let j = i + 1; j < active.length; j++) {
      const candidate = active[j]
      if (visited.has(candidate.id)) continue

      const score = jaccardSimilarity(getTokens(anchor), getTokens(candidate))
      if (score >= JACCARD_THRESHOLD) {
        group.push(candidate)
        visited.add(candidate.id)
      }
    }

    if (group.length >= 2) {
      const sorted = [...group].sort((a, b) => b._count.entries - a._count.entries)
      groups.push({
        key: sorted[0].normalizedName,
        counterparties: sorted,
        totalEntries: group.reduce((sum, cp) => sum + cp._count.entries, 0),
      })
    }
  }

  return groups.sort((a, b) => b.totalEntries - a.totalEntries)
}
