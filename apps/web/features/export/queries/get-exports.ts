import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export interface ExportWithDetails {
  id: string
  name: string
  filePath: string
  fileSize: number | null
  startDate: Date
  endDate: Date
  entryCount: number | null
  documentCount: number | null
  includesCsv: boolean
  includesPdf: boolean
  includesDocuments: boolean
  status: string
  errorMessage: string | null
  createdAt: Date
  completedAt: Date | null
}

export async function getExports(limit = 20): Promise<ExportWithDetails[]> {
  const { organizationId } = await getAuthContext()

  const exports = await prisma.export.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return exports as ExportWithDetails[]
}

export async function getExportById(id: string): Promise<ExportWithDetails | null> {
  const { organizationId } = await getAuthContext()

  const exportRecord = await prisma.export.findFirst({
    where: { id, organizationId },
  })

  return exportRecord as ExportWithDetails | null
}

export interface EntryForExport {
  id: string
  date: Date
  amount: number
  currency: string
  description: string | null
  entryType: "fixed" | "variable" | null
  status: string
  counterparty: {
    id: string
    name: string
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
  documents: {
    id: string
    fileName: string
    filePath: string
    mimeType: string | null
  }[]
}

export async function getExpensesForExport(
  startDate: Date,
  endDate: Date
): Promise<EntryForExport[]> {
  const { organizationId } = await getAuthContext()

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      date: { gte: startDate, lte: endDate },
      status: { not: "excluded" },
    },
    include: {
      counterparty: {
        select: { id: true, name: true },
      },
      category: {
        select: { id: true, name: true, color: true },
      },
      transaction: {
        select: {
          documents: {
            select: { id: true, fileName: true, filePath: true, mimeType: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  })

  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    currency: e.currency,
    description: e.description,
    entryType: e.entryType as "fixed" | "variable" | null,
    status: e.status,
    counterparty: e.counterparty,
    category: e.category,
    documents: e.transaction?.documents ?? [],
  }))
}

export interface ExportPreview {
  expenseCount: number
  invoiceCount: number
  totalAmount: number
  fixedAmount: number
  variableAmount: number
  currency: string
  categoryBreakdown: {
    name: string
    amount: number
    color: string
  }[]
}

export async function getExportPreview(
  startDate: Date,
  endDate: Date
): Promise<ExportPreview> {
  const { organizationId } = await getAuthContext()

  const entries = await prisma.entry.findMany({
    where: {
      organizationId,
      direction: "expense",
      date: { gte: startDate, lte: endDate },
      status: { not: "excluded" },
    },
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      transaction: {
        select: {
          _count: {
            select: { documents: true },
          },
        },
      },
    },
  })

  let totalAmount = 0
  let fixedAmount = 0
  let variableAmount = 0
  let documentCount = 0
  let currency = "EUR"

  const categoryMap = new Map<string, { name: string; amount: number; color: string }>()

  for (const entry of entries) {
    totalAmount += entry.amount
    documentCount += entry.transaction?._count.documents ?? 0
    currency = entry.currency

    if (entry.entryType === "fixed") {
      fixedAmount += entry.amount
    } else {
      variableAmount += entry.amount
    }

    const categoryKey = entry.category?.id || "uncategorized"
    const existing = categoryMap.get(categoryKey)
    if (existing) {
      existing.amount += entry.amount
    } else {
      categoryMap.set(categoryKey, {
        name: entry.category?.name || "Sin categoria",
        amount: entry.amount,
        color: entry.category?.color || "#888888",
      })
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.amount - a.amount
  )

  return {
    expenseCount: entries.length,
    invoiceCount: documentCount,
    totalAmount,
    fixedAmount,
    variableAmount,
    currency,
    categoryBreakdown,
  }
}
