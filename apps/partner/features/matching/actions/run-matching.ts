"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { findBestMatches } from "@polso/matching"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"
import { subDays } from "date-fns"

export interface RunMatchingResult {
  created: number
  skipped: number
}

export async function runMatchingAction(
  clientId: string
): Promise<ActionResponse<RunMatchingResult>> {
  try {
    const ctx = await getPartnerAuthContext()

    const link = await prisma.partnerClient.findFirst({
      where: { partnerId: ctx.organizationId, clientId, status: "active" },
    })
    if (!link) return errorResponse("Client not found", "NOT_FOUND")

    // Fetch unmatched inbox items
    const inboxItems = await prisma.inboxItem.findMany({
      where: {
        organizationId: clientId,
        status: { in: ["pending", "processing"] },
        transactionId: null,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        date: true,
        displayName: true,
        cif: true,
      },
    })

    if (inboxItems.length === 0) {
      return successResponse({ created: 0, skipped: 0 })
    }

    // Fetch recent transactions (90-day window for date scoring)
    const cutoff = subDays(new Date(), 90)
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: clientId,
        date: { gte: cutoff },
        amount: { gt: 0 }, // expenses only (Tink: positive = money out)
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        date: true,
        name: true,
        merchantName: true,
      },
    })

    if (transactions.length === 0) {
      return successResponse({ created: 0, skipped: 0 })
    }

    // Get already-processed pairs to skip
    const existing = await prisma.matchSuggestion.findMany({
      where: { organizationId: clientId },
      select: { transactionId: true, inboxItemId: true },
    })
    const existingPairs = new Set(existing.map((e) => `${e.transactionId}:${e.inboxItemId}`))

    // Build candidate pairs (cross-product)
    const candidates = inboxItems.flatMap((inbox) =>
      transactions.map((tx) => ({
        transactionId: tx.id,
        transactionAmount: tx.amount,
        transactionDate: tx.date,
        transactionName: tx.merchantName ?? tx.name,
        transactionCurrency: tx.currency,
        inboxItemId: inbox.id,
        inboxAmount: inbox.amount ? Number(inbox.amount) : null,
        inboxDate: inbox.date,
        inboxDisplayName: inbox.displayName,
        inboxCurrency: inbox.currency,
        inboxCif: inbox.cif ?? null,
      }))
    )

    const results = findBestMatches(candidates)

    let created = 0
    let skipped = 0

    for (const result of results) {
      const pairKey = `${result.transactionId}:${result.inboxItemId}`
      if (existingPairs.has(pairKey)) {
        skipped++
        continue
      }

      await prisma.matchSuggestion.create({
        data: {
          organizationId: clientId,
          transactionId: result.transactionId,
          inboxItemId: result.inboxItemId,
          confidenceScore: result.scores.confidenceScore,
          amountScore: result.scores.amountScore,
          dateScore: result.scores.dateScore,
          nameScore: result.scores.nameScore,
          currencyScore: result.scores.currencyScore,
          matchType: result.matchType,
          status: "pending",
        },
      })
      created++
    }

    revalidatePath(`/clients/${clientId}/conciliation`)

    return successResponse({ created, skipped })
  } catch (error) {
    console.error("run-matching error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error ejecutando matching",
      "ERROR"
    )
  }
}
