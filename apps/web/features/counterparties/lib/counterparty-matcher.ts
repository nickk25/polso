import { prisma } from "@/lib/db"
import { normalizeCounterpartyName } from "@polso/banking"

export interface MatchedCounterparty {
  id: string
  defaultCategoryId: string | null
  defaultEntryType: string | null
}

type CounterpartyType = "vendor" | "client"

export async function findOrCreateCounterparty(
  organizationId: string,
  counterpartyName: string,
  type: CounterpartyType,
  lookup?: Map<string, MatchedCounterparty>
): Promise<MatchedCounterparty> {
  const normalizedName = normalizeCounterpartyName(counterpartyName)

  if (!normalizedName) {
    throw new Error("Cannot create counterparty with empty name")
  }

  if (lookup) {
    const cached = lookup.get(normalizedName)
    if (cached) return cached
  }

  // Try exact normalized name match
  let counterparty = await prisma.counterparty.findFirst({
    where: { organizationId, normalizedName },
    select: { id: true, defaultCategoryId: true, defaultEntryType: true, type: true },
  })

  if (counterparty) {
    // Upgrade type to "both" if it appears on the opposite side
    if (counterparty.type !== type && counterparty.type !== "both") {
      await prisma.counterparty.update({
        where: { id: counterparty.id },
        data: { type: "both" },
      })
    }
    return {
      id: counterparty.id,
      defaultCategoryId: counterparty.defaultCategoryId,
      defaultEntryType: counterparty.defaultEntryType,
    }
  }

  // Try detection patterns
  const withPatterns = await prisma.counterparty.findMany({
    where: { organizationId, detectionPatterns: { isEmpty: false } },
    select: { id: true, defaultCategoryId: true, defaultEntryType: true, detectionPatterns: true, type: true },
  })

  for (const c of withPatterns) {
    for (const pattern of c.detectionPatterns) {
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        if (c.type !== type && c.type !== "both") {
          await prisma.counterparty.update({ where: { id: c.id }, data: { type: "both" } })
        }
        return { id: c.id, defaultCategoryId: c.defaultCategoryId, defaultEntryType: c.defaultEntryType }
      }
    }
  }

  // Create new counterparty
  counterparty = await prisma.counterparty.create({
    data: {
      organizationId,
      name: counterpartyName.trim(),
      normalizedName,
      type,
      isAutoDetected: true,
      detectionPatterns: [normalizedName],
    },
    select: { id: true, defaultCategoryId: true, defaultEntryType: true, type: true },
  })

  return {
    id: counterparty.id,
    defaultCategoryId: counterparty.defaultCategoryId,
    defaultEntryType: counterparty.defaultEntryType,
  }
}

export async function buildCounterpartyLookup(
  organizationId: string
): Promise<Map<string, MatchedCounterparty>> {
  const counterparties = await prisma.counterparty.findMany({
    where: { organizationId },
    select: { id: true, normalizedName: true, defaultCategoryId: true, defaultEntryType: true },
  })

  return new Map(
    counterparties.map((c) => [
      c.normalizedName,
      { id: c.id, defaultCategoryId: c.defaultCategoryId, defaultEntryType: c.defaultEntryType },
    ])
  )
}
