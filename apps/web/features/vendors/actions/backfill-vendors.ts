"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@polso/banking"

interface BackfillResult {
  vendorsCreated: number
  expensesLinked: number
  alreadyLinked: number
}

/**
 * Create vendors from existing transactions/expenses that don't have vendors yet
 * Groups by normalized counterparty name and creates one vendor per unique name
 */
export async function backfillVendorsAction(): Promise<ActionResponse<BackfillResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find all expenses without a vendor but with a transaction that has counterparty info
    const expensesWithoutVendor = await prisma.expense.findMany({
      where: {
        organizationId,
        vendorId: null,
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

    if (expensesWithoutVendor.length === 0) {
      return successResponse({
        vendorsCreated: 0,
        expensesLinked: 0,
        alreadyLinked: 0,
      })
    }

    // Get existing vendors for lookup
    const existingVendors = await prisma.vendor.findMany({
      where: { organizationId },
      select: {
        id: true,
        normalizedName: true,
      },
    })

    const vendorLookup = new Map(
      existingVendors.map((v) => [v.normalizedName, v.id])
    )

    // Group expenses by normalized counterparty name
    const groupedByCounterparty = new Map<
      string,
      { displayName: string; expenseIds: string[] }
    >()

    for (const expense of expensesWithoutVendor) {
      const counterpartyName = expense.transaction?.counterpartyName
      if (!counterpartyName) continue

      // Use merchant name for display, fall back to transaction name
      const displayName =
        expense.transaction?.merchantName ||
        expense.transaction?.name ||
        counterpartyName

      if (!groupedByCounterparty.has(counterpartyName)) {
        groupedByCounterparty.set(counterpartyName, {
          displayName,
          expenseIds: [],
        })
      }
      groupedByCounterparty.get(counterpartyName)!.expenseIds.push(expense.id)
    }

    let vendorsCreated = 0
    let expensesLinked = 0
    let alreadyLinked = 0

    // Process each unique counterparty
    for (const [normalizedName, { displayName, expenseIds }] of groupedByCounterparty) {
      let vendorId = vendorLookup.get(normalizedName)

      if (vendorId) {
        // Vendor already exists, just link expenses
        alreadyLinked += expenseIds.length
      } else {
        // Create new vendor
        const vendor = await prisma.vendor.create({
          data: {
            organizationId,
            name: displayName,
            normalizedName,
            isAutoDetected: true,
            detectionPatterns: [normalizedName],
          },
        })
        vendorId = vendor.id
        vendorLookup.set(normalizedName, vendorId)
        vendorsCreated++
      }

      // Link expenses to vendor
      await prisma.expense.updateMany({
        where: {
          id: { in: expenseIds },
        },
        data: {
          vendorId,
        },
      })
      expensesLinked += expenseIds.length
    }

    revalidatePath("/vendors")
    revalidatePath("/expenses")

    return successResponse({
      vendorsCreated,
      expensesLinked,
      alreadyLinked,
    })
  } catch (error) {
    console.error("Error backfilling vendors:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create vendors from transactions",
      "ERROR"
    )
  }
}
