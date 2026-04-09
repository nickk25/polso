import { prisma } from "@/lib/db"
import { normalizeCounterpartyName } from "@polso/banking"

export interface MatchedVendor {
  id: string
  defaultCategoryId: string | null
}

/**
 * Find an existing vendor or create a new one during transaction sync
 *
 * This function handles vendor matching/creation for the transaction sync process.
 * It first tries to match by normalized name, then by detection patterns.
 * If no match is found, it creates a new vendor.
 *
 * @param organizationId - The organization to search/create in
 * @param counterpartyName - The raw counterparty name from the transaction
 * @param vendorLookup - Optional pre-fetched vendor lookup map for performance
 * @returns The matched or created vendor with its ID and default category
 */
export async function findOrCreateVendor(
  organizationId: string,
  counterpartyName: string,
  vendorLookup?: Map<string, MatchedVendor>
): Promise<MatchedVendor> {
  const normalizedName = normalizeCounterpartyName(counterpartyName)

  if (!normalizedName) {
    throw new Error("Cannot create vendor with empty name")
  }

  // First, check the lookup map if provided (for batch operations)
  if (vendorLookup) {
    const cached = vendorLookup.get(normalizedName)
    if (cached) {
      return cached
    }
  }

  // Try to find by normalized name
  let vendor = await prisma.vendor.findFirst({
    where: {
      organizationId,
      normalizedName,
    },
    select: {
      id: true,
      defaultCategoryId: true,
    },
  })

  if (vendor) {
    return {
      id: vendor.id,
      defaultCategoryId: vendor.defaultCategoryId,
    }
  }

  // Try to find by detection patterns (partial match)
  const vendorsWithPatterns = await prisma.vendor.findMany({
    where: {
      organizationId,
      detectionPatterns: { isEmpty: false },
    },
    select: {
      id: true,
      defaultCategoryId: true,
      detectionPatterns: true,
    },
  })

  for (const v of vendorsWithPatterns) {
    for (const pattern of v.detectionPatterns) {
      // Check if the normalized name contains the pattern or vice versa
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        return {
          id: v.id,
          defaultCategoryId: v.defaultCategoryId,
        }
      }
    }
  }

  // No match found - create new vendor
  vendor = await prisma.vendor.create({
    data: {
      organizationId,
      name: counterpartyName.trim(), // Keep original name for display
      normalizedName,
      isAutoDetected: true,
      detectionPatterns: [normalizedName],
    },
    select: {
      id: true,
      defaultCategoryId: true,
    },
  })

  return {
    id: vendor.id,
    defaultCategoryId: vendor.defaultCategoryId,
  }
}

/**
 * Build a vendor lookup map for batch operations
 *
 * Pre-fetches all vendors for an organization to avoid N+1 queries
 * during transaction sync.
 *
 * @param organizationId - The organization to fetch vendors for
 * @returns Map of normalized name to vendor info
 */
export async function buildVendorLookup(
  organizationId: string
): Promise<Map<string, MatchedVendor>> {
  const vendors = await prisma.vendor.findMany({
    where: { organizationId },
    select: {
      id: true,
      normalizedName: true,
      defaultCategoryId: true,
    },
  })

  return new Map(
    vendors.map((v) => [
      v.normalizedName,
      { id: v.id, defaultCategoryId: v.defaultCategoryId },
    ])
  )
}
