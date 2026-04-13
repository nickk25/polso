"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { deleteFile } from "@/lib/storage/r2"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

interface CreateInvoiceInput {
  expenseId: string
  fileName: string
  filePath: string // R2 key
  fileSize: number
  mimeType: string
}

export interface InvoiceWithUrl {
  id: string
  fileName: string
  filePath: string
  fileSize: number | null
  mimeType: string | null
  createdAt: Date
  downloadUrl: string
}

export interface InboxItemWithUrl {
  id: string
  fileName: string
  filePath: string
  fileSize: number | null
  mimeType: string | null
  createdAt: Date
  downloadUrl: string
  source: string
}

/**
 * Create an invoice record after successful R2 upload
 */
export async function createInvoiceRecordAction(
  input: CreateInvoiceInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify expense belongs to organization
    const expense = await prisma.expense.findFirst({
      where: {
        id: input.expenseId,
        organizationId,
      },
      select: { id: true },
    })

    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND")
    }

    // Verify the file path includes the correct organization
    if (!input.filePath.includes(organizationId)) {
      return errorResponse("Invalid file path", "INVALID_PATH")
    }

    // Create the invoice record
    const invoice = await prisma.expenseInvoice.create({
      data: {
        organizationId,
        expenseId: input.expenseId,
        fileName: input.fileName,
        filePath: input.filePath,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
    })

    revalidatePath("/expenses")

    return successResponse({ id: invoice.id })
  } catch (error) {
    console.error("Error creating invoice record:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create invoice record",
      "ERROR"
    )
  }
}

/**
 * Delete an invoice from both database and R2 storage
 */
export async function deleteInvoiceAction(
  invoiceId: string
): Promise<ActionResponse<void>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify invoice belongs to organization (dual-condition security)
    const invoice = await prisma.expenseInvoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      select: {
        id: true,
        filePath: true,
        expenseId: true,
      },
    })

    if (!invoice) {
      return errorResponse("Invoice not found", "NOT_FOUND")
    }

    // Delete from R2 storage
    try {
      await deleteFile(invoice.filePath)
    } catch (error) {
      console.error("Error deleting file from R2:", error)
      // Continue with DB deletion even if R2 fails
    }

    // Delete from database
    await prisma.expenseInvoice.delete({
      where: { id: invoiceId },
    })

    // Check if any invoices remain for this expense
    const remainingCount = await prisma.expenseInvoice.count({
      where: {
        expenseId: invoice.expenseId,
        organizationId,
      },
    })

    // If no invoices remain, mark expense as pending
    if (remainingCount === 0) {
      await prisma.expense.update({
        where: { id: invoice.expenseId },
        data: { status: "pending" },
      })
    }

    revalidatePath("/expenses")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete invoice",
      "ERROR"
    )
  }
}

export interface ExpenseAttachments {
  invoices: InvoiceWithUrl[]
  inboxItems: InboxItemWithUrl[]
}

/**
 * Get all invoices and matched inbox items for an expense
 */
export async function getExpenseInvoicesAction(
  expenseId: string
): Promise<ActionResponse<ExpenseAttachments>> {
  try {
    const { organizationId } = await getAuthContext()

    // Verify expense belongs to organization
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        organizationId,
      },
      select: { id: true, transactionId: true },
    })

    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND")
    }

    // Fetch manually uploaded invoices and inbox items in parallel
    const [invoices, inboxItemRecords] = await Promise.all([
      prisma.expenseInvoice.findMany({
        where: { expenseId, organizationId },
        select: { id: true, fileName: true, filePath: true, fileSize: true, mimeType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      expense.transactionId
        ? prisma.inboxItem.findMany({
            where: { transactionId: expense.transactionId, organizationId },
            select: { id: true, fileName: true, filePath: true, size: true, contentType: true, source: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ])

    const invoicesWithUrls: InvoiceWithUrl[] = invoices.map((invoice) => ({
      ...invoice,
      downloadUrl: `/api/invoices/${invoice.id}`,
    }))

    const inboxItemsWithUrls: InboxItemWithUrl[] = inboxItemRecords.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      filePath: item.filePath,
      fileSize: item.size,
      mimeType: item.contentType,
      createdAt: item.createdAt,
      downloadUrl: `/api/inbox/${item.id}`,
      source: item.source,
    }))

    return successResponse({ invoices: invoicesWithUrls, inboxItems: inboxItemsWithUrls })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch invoices",
      "ERROR"
    )
  }
}
