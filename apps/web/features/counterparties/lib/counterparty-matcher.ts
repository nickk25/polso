import { prisma } from "@/lib/db"
import { canonicalize, isGovKey } from "@polso/banking"

export interface MatchedCounterparty {
  id: string
  defaultCategoryId: string | null
  defaultEntryType: string | null
  /** The resolved dedup key actually stored on the row. */
  normalizedName: string
  iban: string | null
}

type CounterpartyType = "vendor" | "client"

const SELECT = {
  id: true,
  defaultCategoryId: true,
  defaultEntryType: true,
  type: true,
  iban: true,
  normalizedName: true,
} as const

interface FindOrCreateOptions {
  /** Source was a structured payee field (creditorName/debtorName) — skips aggressive stripping. */
  structured?: boolean
  /** Beneficiary IBAN, when the bank provided one (transfers/direct-debits). */
  iban?: string | null
  /** In-batch cache keyed by resolved dedup key, to avoid repeated lookups during a sync. */
  lookup?: Map<string, MatchedCounterparty>
}

function toMatched(row: {
  id: string
  defaultCategoryId: string | null
  defaultEntryType: string | null
  iban: string | null
  normalizedName: string
}): MatchedCounterparty {
  return {
    id: row.id,
    defaultCategoryId: row.defaultCategoryId,
    defaultEntryType: row.defaultEntryType,
    normalizedName: row.normalizedName,
    iban: row.iban,
  }
}

/**
 * Resolve (or create) the canonical counterparty for a raw bank name.
 *
 * Returns `null` when the name canonicalizes to nothing (pure bank/operation
 * noise) — the caller stores the transaction with no counterparty.
 *
 * Match order (see docs/VENDOR_MATCHING_AUDIT.md):
 *   1. government rows  → exact `gov:` key (IBAN never used to merge these)
 *   2. IBAN-first       → an existing row with the same beneficiary IBAN wins,
 *                         unifying name variants under one account
 *   3. matchKey exact   → with the hard invariant that two rows with *differing
 *                         non-null* IBANs never merge (the collision is split by
 *                         appending the IBAN tail to the key)
 *   4. else create
 */
export async function findOrCreateCounterparty(
  organizationId: string,
  counterpartyName: string,
  type: CounterpartyType,
  options: FindOrCreateOptions = {}
): Promise<MatchedCounterparty | null> {
  const { structured = false, lookup } = options
  const { matchKey, displayName, seenLocations } = canonicalize(counterpartyName, { structured })

  if (!matchKey) return null // generic / operation noise — no counterparty

  const gov = isGovKey(matchKey)
  const iban = gov ? null : options.iban?.trim() || null

  const upgradeType = async (row: { id: string; type: string }) => {
    if (row.type !== type && row.type !== "both") {
      await prisma.counterparty.update({ where: { id: row.id }, data: { type: "both" } })
    }
  }
  const cacheAndReturn = (key: string, matched: MatchedCounterparty): MatchedCounterparty => {
    lookup?.set(key, matched)
    return matched
  }
  const findByKey = (normalizedName: string) =>
    prisma.counterparty.findFirst({ where: { organizationId, normalizedName }, select: SELECT })

  // Fast path: in-batch cache hit that isn't a differing-IBAN collision.
  const cached = lookup?.get(matchKey)
  if (cached && !(iban && cached.iban && cached.iban !== iban)) return cached

  // 1) IBAN-first — strongest identity for transfers/direct-debits.
  if (iban) {
    const byIban = await prisma.counterparty.findFirst({ where: { organizationId, iban }, select: SELECT })
    if (byIban) {
      await upgradeType(byIban)
      return cacheAndReturn(byIban.normalizedName, toMatched(byIban))
    }
  }

  // 2) matchKey exact, honoring the differing-non-null-IBAN discriminator.
  let dedupKey = matchKey
  let row = await findByKey(dedupKey)
  if (row) {
    if (iban && row.iban && row.iban !== iban) {
      // Same canonical name, different beneficiary IBAN → distinct entity.
      dedupKey = `${matchKey}#${iban.slice(-4)}`
      row = await findByKey(dedupKey)
    } else {
      if (iban && !row.iban) await prisma.counterparty.update({ where: { id: row.id }, data: { iban } })
      await upgradeType(row)
      return cacheAndReturn(dedupKey, toMatched({ ...row, iban: row.iban ?? iban }))
    }
  }
  if (row) {
    await upgradeType(row)
    return cacheAndReturn(dedupKey, toMatched(row))
  }

  // 3) Create. Seed detection patterns with clean brand tokens (never the raw string).
  const created = await prisma.counterparty.create({
    data: {
      organizationId,
      name: displayName || counterpartyName.trim(),
      normalizedName: dedupKey,
      type,
      iban,
      seenLocations,
      isAutoDetected: true,
      detectionPatterns: gov ? [] : matchKey.split(" "),
    },
    select: SELECT,
  })

  const matched = toMatched(created)
  lookup?.set(dedupKey, matched)
  return matched
}

export async function buildCounterpartyLookup(
  organizationId: string
): Promise<Map<string, MatchedCounterparty>> {
  const counterparties = await prisma.counterparty.findMany({
    where: { organizationId },
    select: { id: true, normalizedName: true, defaultCategoryId: true, defaultEntryType: true, iban: true },
  })

  return new Map(counterparties.map((c) => [c.normalizedName, toMatched(c)]))
}
