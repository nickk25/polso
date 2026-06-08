import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export interface ExportableTransaction {
  id: string
  date: Date
  description: string | null
  merchantName: string | null
  amount: number
  currency: string
  categoryName: string | null
  categoryAccountCode: string | null
  expenseType: string | null
  vendorName: string | null
  vendorTaxId: string | null
  accountName: string
  attachmentFileName: string | null
  attachmentFilePath: string | null
  attachmentContentType: string | null
  conciliationStatus: "matched" | "unmatched"
  notes: string | null
  taxRate: number | null
  taxAmount: number | null
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
      id: true,
      date: true,
      name: true,
      merchantName: true,
      amount: true,
      currency: true,
      account: { select: { name: true } },
      entry: {
        select: {
          entryType: true,
          notes: true,
          status: true,
          taxAmount: true,
          taxRate: true,
          category: { select: { name: true, accountCode: true } },
          counterparty: { select: { name: true, taxId: true } },
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
    id: t.id,
    date: t.date,
    description: t.name,
    merchantName: t.merchantName,
    amount: t.amount,
    currency: t.currency,
    categoryName: t.entry?.category?.name ?? null,
    categoryAccountCode: t.entry?.category?.accountCode ?? null,
    expenseType: t.entry?.entryType ?? null,
    vendorName: t.entry?.counterparty?.name ?? null,
    vendorTaxId: t.entry?.counterparty?.taxId ?? null,
    accountName: t.account.name,
    attachmentFileName: t.transactionAttachments[0]?.inboxItem?.fileName ?? null,
    attachmentFilePath: t.transactionAttachments[0]?.inboxItem?.filePath ?? null,
    attachmentContentType: t.transactionAttachments[0]?.inboxItem?.contentType ?? null,
    conciliationStatus: t.transactionAttachments.length > 0 ? "matched" : "unmatched",
    notes: t.entry?.notes ?? null,
    taxRate: t.entry?.taxRate ?? null,
    taxAmount: t.entry?.taxAmount ?? null,
  }))
}
