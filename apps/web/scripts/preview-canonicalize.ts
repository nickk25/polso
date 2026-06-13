/**
 * READ-ONLY integration preview for the vendor canonicalize() redesign.
 * Applies canonicalize() to every existing Counterparty.name and reports the
 * resulting groupings — no writes. Used to eyeball over-/under-collapse before
 * the real backfill migration. Safe to delete after review.
 *
 * Run: pnpm --filter @polso/db exec tsx ../../scripts/preview-canonicalize.ts
 * (or from repo root with DATABASE_URL set: npx tsx scripts/preview-canonicalize.ts)
 */
import { prisma } from "@polso/db"
import { canonicalize, isGovKey } from "@polso/banking"
import { computeMergeSuggestions } from "@/features/counterparties/lib/merge-suggestions"
import type { CounterpartyWithStats } from "@/features/counterparties/queries/get-counterparties"

async function main() {
  const cps = await prisma.counterparty.findMany({
    select: { id: true, name: true, normalizedName: true, _count: { select: { entries: true } } },
  })

  const groups = new Map<string, { names: Set<string>; entries: number; count: number }>()
  let emptyKey = 0
  const emptyExamples: string[] = []

  for (const cp of cps) {
    const { matchKey } = canonicalize(cp.name)
    if (!matchKey) {
      emptyKey++
      if (emptyExamples.length < 25) emptyExamples.push(cp.name)
      continue
    }
    const g = groups.get(matchKey) ?? { names: new Set(), entries: 0, count: 0 }
    g.names.add(cp.name)
    g.entries += cp._count.entries
    g.count++
    groups.set(matchKey, g)
  }

  const collisions = [...groups.entries()]
    .filter(([, g]) => g.count > 1)
    .sort((a, b) => b[1].count - a[1].count)

  console.log(`\n=== CANONICALIZE PREVIEW (read-only) ===`)
  console.log(`Total counterparties:        ${cps.length}`)
  console.log(`Distinct matchKeys (non-empty): ${groups.size}`)
  console.log(`Empty-key (generic, suppressed): ${emptyKey}`)
  console.log(`Collision groups (>=2 rows):    ${collisions.length}`)
  console.log(`Rows that will collapse:        ${collisions.reduce((s, [, g]) => s + g.count, 0)}`)

  console.log(`\n--- TOP COLLISIONS (matchKey  ←  N distinct source names) ---`)
  for (const [k, g] of collisions.slice(0, 40)) {
    const tag = isGovKey(k) ? " [gov]" : ""
    console.log(`\n● ${k}${tag}  (${g.count} rows, ${g.entries} entries)`)
    for (const n of [...g.names].slice(0, 6)) console.log(`    - ${n.slice(0, 70)}`)
    if (g.names.size > 6) console.log(`    … +${g.names.size - 6} more`)
  }

  console.log(`\n--- EMPTY-KEY (generic) SAMPLES ---`)
  for (const n of emptyExamples) console.log(`    - ${n.slice(0, 70)}`)

  // Over-collapse heuristic: groups whose source names share NO common brand token
  // are suspicious (possible wrongful merge). Flag for manual review.
  console.log(`\n--- ⚠ POSSIBLE OVER-COLLAPSE (no shared word across source names) ---`)
  let flagged = 0
  for (const [k, g] of collisions) {
    if (isGovKey(k)) continue
    const tokenSets = [...g.names].map(
      (n) => new Set(n.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2))
    )
    const common = [...tokenSets[0]].filter((t) => tokenSets.every((s) => s.has(t)))
    if (common.length === 0) {
      flagged++
      console.log(`\n● ${k}  (${g.count} rows) — NO shared token:`)
      for (const n of [...g.names].slice(0, 5)) console.log(`    - ${n.slice(0, 70)}`)
    }
  }
  if (flagged === 0) console.log("    (none — every collision shares a common word ✓)")

  // Simulate post-migration merge SUGGESTIONS: treat each distinct matchKey as one
  // counterparty and run the real suggestion logic. Should surface only sensible
  // similar-but-distinct review candidates (e.g. zara vs zara home), never junk.
  const simulated: CounterpartyWithStats[] = [...groups.entries()].map(([k, g], i) => ({
    id: `sim-${i}`,
    organizationId: "sim",
    name: [...g.names][0],
    normalizedName: k,
    type: "vendor",
    email: null,
    phone: null,
    website: null,
    taxId: null,
    logoUrl: null,
    defaultCategoryId: null,
    defaultEntryType: null,
    isAutoDetected: true,
    detectionPatterns: [],
    createdAt: new Date(0),
    totalSpent: 0,
    lastEntryDate: null,
    _count: { entries: g.count },
  })) as unknown as CounterpartyWithStats[]

  const suggestions = computeMergeSuggestions(simulated)
  console.log(`\n--- POST-MIGRATION MERGE SUGGESTIONS (review candidates) ---`)
  console.log(`Suggestion groups: ${suggestions.length}`)
  for (const s of suggestions) {
    console.log(`\n● conf ${s.confidence.toFixed(2)} · shared [${s.sharedTokens.join(", ")}]`)
    for (const cp of s.counterparties) console.log(`    - ${cp.normalizedName}  ("${cp.name.slice(0, 40)}")`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
