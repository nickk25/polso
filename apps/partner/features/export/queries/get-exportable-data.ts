import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface ExportableTransaction {
  date: Date
  description: string | null
  merchantName: string | null
  amount: number
  currency: string
  categoryName: string | null
  expenseType: string | null
  vendorName: string | null
  accountName: string
  attachmentFileName: string | null
  attachmentFilePath: string | null
  attachmentContentType: string | null
  conciliationStatus: "matched" | "unmatched"
  notes: string | null
}

export async function getExportableData(
  partnerId: string,
  clientId: string,
  from: Date,
  to: Date
): Promise<ExportableTransaction[]> {
  const link = await prisma.partnerClient.findFirst({
    where: { partnerId, clientId, status: "active" },
  })

  if (!link) notFound()

  const transactions = await prisma.transaction.findMany({
    where: {
      organizationId: clientId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      name: true,
      merchantName: true,
      amount: true,
      currency: true,
      account: { select: { name: true } },
      expense: {
        select: {
          expenseType: true,
          notes: true,
          status: true,
          category: { select: { name: true } },
          vendor: { select: { name: true } },
          invoices: {
            select: { fileName: true, filePath: true, mimeType: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      transactionAttachments: {
        select: {
          inboxItem: { select: { fileName: true, filePath: true, contentType: true } },
        },
        take: 1,
      },
    },
  })

  return transactions.map((t) => ({
    date: t.date,
    description: t.name,
    merchantName: t.merchantName,
    amount: t.amount,
    currency: t.currency,
    categoryName: t.expense?.category?.name ?? null,
    expenseType: t.expense?.expenseType ?? null,
    vendorName: t.expense?.vendor?.name ?? null,
    accountName: t.account.name,
    attachmentFileName:
      t.transactionAttachments[0]?.inboxItem?.fileName ??
      t.expense?.invoices[0]?.fileName ??
      null,
    attachmentFilePath:
      t.transactionAttachments[0]?.inboxItem?.filePath ??
      t.expense?.invoices[0]?.filePath ??
      null,
    attachmentContentType:
      t.transactionAttachments[0]?.inboxItem?.contentType ??
      t.expense?.invoices[0]?.mimeType ??
      null,
    conciliationStatus:
      t.transactionAttachments.length > 0 || t.expense?.status === "documented"
        ? "matched"
        : "unmatched",
    notes: t.expense?.notes ?? null,
  }))
}
