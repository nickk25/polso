"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { deleteFile } from "@/lib/storage/r2"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { getSignedDownloadUrl } from "@/lib/storage/r2"

export interface TransactionDocumentWithUrl {
  id: string
  fileName: string
  filePath: string
  fileSize: number | null
  mimeType: string | null
  createdAt: Date
  downloadUrl: string
  source: "document" | "inbox"
}

export async function getTransactionDocumentsAction(
  transactionId: string
): Promise<ActionResponse<{ documents: TransactionDocumentWithUrl[] }>> {
  try {
    const { organizationId } = await getAuthContext()

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, organizationId },
      select: { id: true },
    })

    if (!transaction) {
      return errorResponse("Transaction not found", "NOT_FOUND")
    }

    const [legacyDocs, attachments] = await Promise.all([
      prisma.transactionDocument.findMany({
        where: { transactionId, organizationId },
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, filePath: true, fileSize: true, mimeType: true, createdAt: true },
      }),
      prisma.transactionAttachment.findMany({
        where: { transactionId },
        orderBy: { createdAt: "desc" },
        select: {
          inboxItem: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              size: true,
              contentType: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

    const documents = await Promise.all([
      ...legacyDocs.map(async (doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        createdAt: doc.createdAt,
        downloadUrl: await getSignedDownloadUrl(doc.filePath, 3600),
        source: "document" as const,
      })),
      ...attachments.map(async (att) => ({
        id: att.inboxItem.id,
        fileName: att.inboxItem.fileName,
        filePath: att.inboxItem.filePath,
        fileSize: att.inboxItem.size,
        mimeType: att.inboxItem.contentType,
        createdAt: att.inboxItem.createdAt,
        downloadUrl: await getSignedDownloadUrl(att.inboxItem.filePath, 3600),
        source: "inbox" as const,
      })),
    ])

    documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return successResponse({ documents })
  } catch (error) {
    console.error("Error fetching transaction documents:", error)
    return errorResponse("Failed to fetch documents", "ERROR")
  }
}

export async function deleteTransactionDocumentAction(
  documentId: string
): Promise<ActionResponse<undefined>> {
  try {
    const { organizationId } = await getAuthContext()

    const doc = await prisma.transactionDocument.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true, filePath: true, transactionId: true },
    })

    if (!doc) {
      return errorResponse("Document not found", "NOT_FOUND")
    }

    try {
      await deleteFile(doc.filePath)
    } catch (error) {
      console.error("Error deleting file from R2:", error)
    }

    await prisma.transactionDocument.delete({ where: { id: documentId } })

    // Revert entry only if no legacy docs AND no inbox attachments remain
    const [remaining, attachments] = await Promise.all([
      prisma.transactionDocument.count({ where: { transactionId: doc.transactionId, organizationId } }),
      prisma.transactionAttachment.count({ where: { transactionId: doc.transactionId } }),
    ])

    if (remaining === 0 && attachments === 0) {
      await prisma.entry.updateMany({
        where: { transactionId: doc.transactionId, organizationId },
        data: { status: "pending" },
      })
    }

    revalidatePath("/transactions")
    revalidatePath("/vault")
    revalidatePath("/dashboard")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error deleting transaction document:", error)
    return errorResponse("Failed to delete document", "ERROR")
  }
}
