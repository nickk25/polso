"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { findBestMatches } from "@polso/matching"
import { processInboxItem, recoverStuckInboxItems } from "@polso/inbox"
import { getFile } from "@polso/storage"
import { successResponse, errorResponse } from "@polso/utils/action-response"
import type { ActionResponse } from "@polso/utils/action-response"

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

    // Re-run full OCR + matching for items that failed extraction
    const ocrFailed = await prisma.inboxItem.findMany({
      where: { organizationId: clientId, status: "ocr_failed" },
      select: { id: true, filePath: true, contentType: true },
    })
    for (const item of ocrFailed) {
      try {
        const { body, contentType } = await getFile(item.filePath)
        await processInboxItem(
          clientId,
          item.id,
          Buffer.from(body),
          item.contentType ?? contentType ?? "application/pdf"
        )
      } catch {
        // leave as ocr_failed, partner can retry again later
      }
    }

    // Fetch unmatched inbox items (processing + no_match) for scoring-only path
    const inboxItems = await prisma.inboxItem.findMany({
      where: {
        organizationId: clientId,
        status: { in: ["processing", "no_match"] },
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

    if (inboxItems.length === 0 && ocrFailed.length === 0) {
      return successResponse({ created: 0, skipped: 0 })
    }

    if (inboxItems.length === 0) {
      revalidatePath(`/clients/${clientId}/conciliation`)
      revalidatePath(`/clients/${clientId}/inbox`)
      return successResponse({ created: 0, skipped: 0 })
    }

    // Fetch all unattached expenses (no date filter — aligns with matchAfterSync)
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: clientId,
        amount: { gt: 0 }, // expenses only (Tink: positive = money out)
        transactionAttachments: { none: {} },
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
    revalidatePath(`/clients/${clientId}/inbox`)

    return successResponse({ created, skipped })
  } catch (error) {
    console.error("run-matching error:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Error ejecutando matching",
      "ERROR"
    )
  }
}
