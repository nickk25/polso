import type { CounterpartyWithStats } from "../queries/get-counterparties"

export interface MergeSuggestionGroup {
  key: string
  counterparties: CounterpartyWithStats[]
  totalEntries: number
}

export function computeMergeSuggestions(counterparties: CounterpartyWithStats[]): MergeSuggestionGroup[] {
  const groups = new Map<string, CounterpartyWithStats[]>()

  for (const cp of counterparties) {
    if (cp._count.entries === 0) continue
    const firstWord = cp.normalizedName.split(" ")[0]
    if (!firstWord || firstWord.length < 4) continue
    if (!groups.has(firstWord)) groups.set(firstWord, [])
    groups.get(firstWord)!.push(cp)
  }

  return Array.from(groups.entries())
    .filter(([, cps]) => cps.length >= 2)
    .map(([key, cps]) => ({
      key,
      counterparties: [...cps].sort((a, b) => b._count.entries - a._count.entries),
      totalEntries: cps.reduce((sum, cp) => sum + cp._count.entries, 0),
    }))
    .sort((a, b) => b.totalEntries - a.totalEntries)
}
