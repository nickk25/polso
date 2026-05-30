"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@polso/banking"

interface BackfillResult {
  counterpartiesCreated: number
  entriesLinked: number
}

export async function backfillCounterpartiesAction(): Promise<ActionResponse<BackfillResult>> {
  try {
    const { organizationId } = await getAuthContext()

    const entriesWithoutCounterparty = await prisma.entry.findMany({
      where: {
        organizationId,
        counterpartyId: null,
        direction: "expense",
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

    if (entriesWithoutCounterparty.length === 0) {
      return successResponse({ counterpartiesCreated: 0, entriesLinked: 0 })
    }

    const existingCounterparties = await prisma.counterparty.findMany({
      where: { organizationId },
      select: { id: true, normalizedName: true },
    })

    const cpLookup = new Map(existingCounterparties.map((c) => [c.normalizedName, c.id]))

    const groupedByCounterparty = new Map<
      string,
      { displayName: string; entryIds: string[] }
    >()

    for (const entry of entriesWithoutCounterparty) {
      const counterpartyName = entry.transaction?.counterpartyName
      if (!counterpartyName) continue

      const normalizedName = normalizeCounterpartyName(counterpartyName)
      const displayName =
        entry.transaction?.merchantName ||
        entry.transaction?.name ||
        counterpartyName

      if (!groupedByCounterparty.has(normalizedName)) {
        groupedByCounterparty.set(normalizedName, { displayName, entryIds: [] })
      }
      groupedByCounterparty.get(normalizedName)!.entryIds.push(entry.id)
    }

    let counterpartiesCreated = 0
    let entriesLinked = 0

    const toCreate: Array<{ normalizedName: string; displayName: string; entryIds: string[] }> = []
    for (const [normalizedName, { displayName, entryIds }] of groupedByCounterparty) {
      if (!cpLookup.has(normalizedName)) {
        toCreate.push({ normalizedName, displayName, entryIds })
      }
    }

    if (toCreate.length > 0) {
      await prisma.counterparty.createMany({
        data: toCreate.map(({ displayName, normalizedName }) => ({
          organizationId,
          name: displayName,
          normalizedName,
          type: "vendor" as const,
          isAutoDetected: true,
          detectionPatterns: [normalizedName],
        })),
        skipDuplicates: true,
      })
      const created = await prisma.counterparty.findMany({
        where: { organizationId, normalizedName: { in: toCreate.map((t) => t.normalizedName) } },
        select: { id: true, normalizedName: true },
      })
      for (const cp of created) {
        cpLookup.set(cp.normalizedName, cp.id)
      }
      counterpartiesCreated = toCreate.length
    }

    const updateOps: Promise<unknown>[] = []
    for (const [normalizedName, { entryIds }] of groupedByCounterparty) {
      const cpId = cpLookup.get(normalizedName)
      if (!cpId) continue
      entriesLinked += entryIds.length
      updateOps.push(prisma.entry.updateMany({ where: { id: { in: entryIds } }, data: { counterpartyId: cpId } }))
    }
    await Promise.all(updateOps)

    revalidatePath("/counterparties")
    revalidatePath("/transactions")

    return successResponse({ counterpartiesCreated, entriesLinked })
  } catch (error) {
    console.error("Error backfilling counterparties:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create counterparties from transactions",
      "ERROR"
    )
  }
}
