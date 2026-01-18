"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@/features/banking/lib/counterparty-normalizer"

interface BackfillResult {
  clientsCreated: number
  incomesLinked: number
  alreadyLinked: number
}

/**
 * Create clients from existing income transactions that don't have clients yet
 * Groups by normalized counterparty name and creates one client per unique name
 */
export async function backfillClientsAction(): Promise<ActionResponse<BackfillResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find all incomes without a client but with a transaction that has counterparty info
    const incomesWithoutClient = await prisma.income.findMany({
      where: {
        organizationId,
        clientId: null,
        transaction: {
          counterpartyName: { not: null },
        },
      },
      include: {
        transaction: {
          select: {
            id: true,
            counterpartyName: true,
            merchantName: true,
            name: true,
          },
        },
      },
    })

    if (incomesWithoutClient.length === 0) {
      return successResponse({
        clientsCreated: 0,
        incomesLinked: 0,
        alreadyLinked: 0,
      })
    }

    // Get existing clients for lookup
    const existingClients = await prisma.client.findMany({
      where: { organizationId },
      select: {
        id: true,
        normalizedName: true,
      },
    })

    const clientLookup = new Map(
      existingClients.map((c) => [c.normalizedName, c.id])
    )

    // Group incomes by normalized counterparty name
    const groupedByCounterparty = new Map<
      string,
      { displayName: string; incomeIds: string[] }
    >()

    for (const income of incomesWithoutClient) {
      const counterpartyName = income.transaction?.counterpartyName
      if (!counterpartyName) continue

      const normalizedName = normalizeCounterpartyName(counterpartyName)

      // Use merchant name for display, fall back to transaction name
      const displayName =
        income.transaction?.merchantName ||
        income.transaction?.name ||
        counterpartyName

      if (!groupedByCounterparty.has(normalizedName)) {
        groupedByCounterparty.set(normalizedName, {
          displayName,
          incomeIds: [],
        })
      }
      groupedByCounterparty.get(normalizedName)!.incomeIds.push(income.id)
    }

    let clientsCreated = 0
    let incomesLinked = 0
    let alreadyLinked = 0

    // Process each unique counterparty
    for (const [normalizedName, { displayName, incomeIds }] of groupedByCounterparty) {
      let clientId = clientLookup.get(normalizedName)

      if (clientId) {
        // Client already exists, just link incomes
        alreadyLinked += incomeIds.length
      } else {
        // Create new client
        const client = await prisma.client.create({
          data: {
            organizationId,
            name: displayName,
            normalizedName,
            isAutoDetected: true,
            detectionPatterns: [normalizedName],
          },
        })
        clientId = client.id
        clientLookup.set(normalizedName, clientId)
        clientsCreated++
      }

      // Link incomes to client
      await prisma.income.updateMany({
        where: {
          id: { in: incomeIds },
        },
        data: {
          clientId,
        },
      })
      incomesLinked += incomeIds.length
    }

    revalidatePath("/clients")
    revalidatePath("/income")

    return successResponse({
      clientsCreated,
      incomesLinked,
      alreadyLinked,
    })
  } catch (error) {
    console.error("Error backfilling clients:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create clients from transactions",
      "ERROR"
    )
  }
}
