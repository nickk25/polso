import { prisma } from "@/lib/db"
import { normalizeCounterpartyName } from "@/features/banking/lib/counterparty-normalizer"

export interface MatchedClient {
  id: string
  defaultCategoryId: string | null
}

/**
 * Find an existing client or create a new one during transaction sync
 *
 * This function handles client matching/creation for the transaction sync process.
 * It first tries to match by normalized name, then by detection patterns.
 * If no match is found, it creates a new client.
 *
 * @param organizationId - The organization to search/create in
 * @param counterpartyName - The raw counterparty name from the transaction
 * @param clientLookup - Optional pre-fetched client lookup map for performance
 * @returns The matched or created client with its ID and default category
 */
export async function findOrCreateClient(
  organizationId: string,
  counterpartyName: string,
  clientLookup?: Map<string, MatchedClient>
): Promise<MatchedClient> {
  const normalizedName = normalizeCounterpartyName(counterpartyName)

  if (!normalizedName) {
    throw new Error("Cannot create client with empty name")
  }

  // First, check the lookup map if provided (for batch operations)
  if (clientLookup) {
    const cached = clientLookup.get(normalizedName)
    if (cached) {
      return cached
    }
  }

  // Try to find by normalized name
  let client = await prisma.client.findFirst({
    where: {
      organizationId,
      normalizedName,
    },
    select: {
      id: true,
      defaultCategoryId: true,
    },
  })

  if (client) {
    return {
      id: client.id,
      defaultCategoryId: client.defaultCategoryId,
    }
  }

  // Try to find by detection patterns (partial match)
  const clientsWithPatterns = await prisma.client.findMany({
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

  for (const c of clientsWithPatterns) {
    for (const pattern of c.detectionPatterns) {
      // Check if the normalized name contains the pattern or vice versa
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        return {
          id: c.id,
          defaultCategoryId: c.defaultCategoryId,
        }
      }
    }
  }

  // No match found - create new client
  client = await prisma.client.create({
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
    id: client.id,
    defaultCategoryId: client.defaultCategoryId,
  }
}

/**
 * Build a client lookup map for batch operations
 *
 * Pre-fetches all clients for an organization to avoid N+1 queries
 * during transaction sync.
 *
 * @param organizationId - The organization to fetch clients for
 * @returns Map of normalized name to client info
 */
export async function buildClientLookup(
  organizationId: string
): Promise<Map<string, MatchedClient>> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      normalizedName: true,
      defaultCategoryId: true,
    },
  })

  return new Map(
    clients.map((c) => [
      c.normalizedName,
      { id: c.id, defaultCategoryId: c.defaultCategoryId },
    ])
  )
}
