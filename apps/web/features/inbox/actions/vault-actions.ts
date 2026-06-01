"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { deleteFile } from "@/lib/storage/r2"

export async function confirmMatchAction(
  matchSuggestionId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { id: matchSuggestionId, organizationId },
      select: { id: true, transactionId: true, inboxItemId: true, status: true },
    })

    if (!suggestion) return errorResponse("Match suggestion not found", "NOT_FOUND")
    if (suggestion.status !== "pending") return errorResponse("Match already actioned", "VALIDATION_ERROR")

    const { transactionId, inboxItemId } = suggestion

    const [inboxItemTax, existingEntry] = await Promise.all([
      prisma.inboxItem.findUnique({ where: { id: inboxItemId }, select: { taxAmount: true, taxRate: true } }),
      prisma.entry.findFirst({ where: { transactionId, organizationId }, select: { taxAmount: true, taxRate: true } }),
    ])

    const taxData: { taxAmount?: number; taxRate?: number } = {}
    if (inboxItemTax?.taxAmount != null && existingEntry?.taxAmount == null) {
      taxData.taxAmount = Number(inboxItemTax.taxAmount)
    }
    if (inboxItemTax?.taxRate != null && existingEntry?.taxRate == null) {
      taxData.taxRate = inboxItemTax.taxRate
    }

    await prisma.$transaction([
      prisma.matchSuggestion.update({
        where: { id: matchSuggestionId },
        data: { status: "confirmed" },
      }),
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
        update: {},
        create: { transactionId, inboxItemId },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId },
      }),
      prisma.entry.updateMany({
        where: { transactionId, organizationId },
        data: { status: "verified", ...taxData },
      }),
    ])

    revalidatePath("/vault")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error confirming match:", error)
    return errorResponse("Failed to confirm match", "ERROR")
  }
}

export async function rejectMatchAction(
  matchSuggestionId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const suggestion = await prisma.matchSuggestion.findFirst({
      where: { id: matchSuggestionId, organizationId },
      select: { id: true, inboxItemId: true },
    })

    if (!suggestion) return errorResponse("Match suggestion not found", "NOT_FOUND")

    await prisma.$transaction([
      prisma.matchSuggestion.update({
        where: { id: matchSuggestionId },
        data: { status: "rejected" },
      }),
      prisma.inboxItem.update({
        where: { id: suggestion.inboxItemId },
        data: { status: "no_match" },
      }),
    ])

    revalidatePath("/vault")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error rejecting match:", error)
    return errorResponse("Failed to reject match", "ERROR")
  }
}

export async function manualMatchAction(
  inboxItemId: string,
  transactionId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const [inboxItem, transaction, existingEntry] = await Promise.all([
      prisma.inboxItem.findFirst({
        where: { id: inboxItemId, organizationId },
        select: { id: true, taxAmount: true, taxRate: true },
      }),
      prisma.transaction.findFirst({ where: { id: transactionId, organizationId }, select: { id: true } }),
      prisma.entry.findFirst({ where: { transactionId, organizationId }, select: { taxAmount: true, taxRate: true } }),
    ])

    if (!inboxItem) return errorResponse("Document not found", "NOT_FOUND")
    if (!transaction) return errorResponse("Transaction not found", "NOT_FOUND")

    const taxData: { taxAmount?: number; taxRate?: number } = {}
    if (inboxItem.taxAmount != null && existingEntry?.taxAmount == null) {
      taxData.taxAmount = Number(inboxItem.taxAmount)
    }
    if (inboxItem.taxRate != null && existingEntry?.taxRate == null) {
      taxData.taxRate = inboxItem.taxRate
    }

    await prisma.$transaction([
      prisma.matchSuggestion.upsert({
        where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
        update: { status: "confirmed" },
        create: {
          organizationId,
          transactionId,
          inboxItemId,
          confidenceScore: 1,
          amountScore: 0,
          dateScore: 0,
          nameScore: 0,
          currencyScore: 0,
          matchType: "manual",
          status: "confirmed",
        },
      }),
      prisma.transactionAttachment.upsert({
        where: { transactionId_inboxItemId: { transactionId, inboxItemId } },
        update: {},
        create: { transactionId, inboxItemId },
      }),
      prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "done", transactionId },
      }),
      prisma.entry.updateMany({
        where: { transactionId, organizationId },
        data: { status: "verified", ...taxData },
      }),
    ])

    revalidatePath("/vault")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error manually matching:", error)
    return errorResponse("Failed to match document", "ERROR")
  }
}

export async function unmatchAction(
  inboxItemId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const inboxItem = await prisma.inboxItem.findFirst({
      where: { id: inboxItemId, organizationId },
      select: { id: true, transactionId: true },
    })

    if (!inboxItem) return errorResponse("Document not found", "NOT_FOUND")
    if (!inboxItem.transactionId) return errorResponse("Document is not matched", "VALIDATION_ERROR")

    const transactionId = inboxItem.transactionId

    // Count remaining docs on this transaction excluding the one we're about to unlink
    const [legacyDocs, otherAttachments] = await Promise.all([
      prisma.transactionDocument.count({ where: { transactionId, organizationId } }),
      prisma.transactionAttachment.count({
        where: { transactionId, inboxItemId: { not: inboxItemId } },
      }),
    ])

    await prisma.$transaction(async (tx) => {
      await tx.transactionAttachment.deleteMany({ where: { inboxItemId, transactionId } })
      await tx.matchSuggestion.updateMany({
        where: { inboxItemId, transactionId, status: "confirmed" },
        data: { status: "rejected" },
      })
      await tx.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: "no_match", transactionId: null },
      })
      if (legacyDocs === 0 && otherAttachments === 0) {
        await tx.entry.updateMany({
          where: { transactionId, organizationId },
          data: { status: "pending" },
        })
      }
    })

    revalidatePath("/vault")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error unmatching:", error)
    return errorResponse("Failed to unmatch document", "ERROR")
  }
}

export async function archiveItemAction(
  inboxItemId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const inboxItem = await prisma.inboxItem.findFirst({
      where: { id: inboxItemId, organizationId },
      select: { id: true },
    })

    if (!inboxItem) return errorResponse("Document not found", "NOT_FOUND")

    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { status: "archived" },
    })

    revalidatePath("/vault")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error archiving item:", error)
    return errorResponse("Failed to archive document", "ERROR")
  }
}

export async function deleteInboxItemAction(
  inboxItemId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const inboxItem = await prisma.inboxItem.findFirst({
      where: { id: inboxItemId, organizationId },
      select: { id: true, filePath: true, transactionId: true },
    })

    if (!inboxItem) return errorResponse("Document not found", "NOT_FOUND")

    try {
      await deleteFile(inboxItem.filePath)
    } catch (error) {
      console.error("Error deleting file from R2:", error)
    }

    await prisma.inboxItem.delete({ where: { id: inboxItemId } })

    if (inboxItem.transactionId) {
      const [remaining, attachments] = await Promise.all([
        prisma.transactionDocument.count({ where: { transactionId: inboxItem.transactionId, organizationId } }),
        prisma.transactionAttachment.count({ where: { transactionId: inboxItem.transactionId } }),
      ])
      if (remaining === 0 && attachments === 0) {
        await prisma.entry.updateMany({
          where: { transactionId: inboxItem.transactionId, organizationId },
          data: { status: "pending" },
        })
      }
    }

    revalidatePath("/vault")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    return successResponse(undefined)
  } catch (error) {
    console.error("Error deleting inbox item:", error)
    return errorResponse("Failed to delete document", "ERROR")
  }
}

export interface TransactionSearchResult {
  id: string
  description: string | null
  merchantName: string | null
  amount: number
  currency: string
  date: Date
}

export async function searchTransactionsForMatchAction(
  query: string
): Promise<ActionResponse<{ transactions: TransactionSearchResult[] }>> {
  try {
    const { organizationId } = await getAuthContext()

    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { merchantName: { contains: query, mode: "insensitive" as const } },
        ],
      },
      select: {
        id: true,
        name: true,
        merchantName: true,
        amount: true,
        currency: true,
        date: true,
      },
      orderBy: { date: "desc" },
      take: 20,
    })

    return successResponse({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        description: tx.name,
        merchantName: tx.merchantName,
        amount: tx.amount,
        currency: tx.currency,
        date: tx.date,
      })),
    })
  } catch (error) {
    console.error("Error searching transactions:", error)
    return errorResponse("Failed to search transactions", "ERROR")
  }
}
