import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"

export interface ExportWithDetails {
  id: string
  name: string
  filePath: string
  fileSize: number | null
  startDate: Date
  endDate: Date
  expenseCount: number | null
  invoiceCount: number | null
  includesCsv: boolean
  includesPdf: boolean
  includesInvoices: boolean
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
    where: {
      id,
      organizationId,
    },
  })

  return exportRecord as ExportWithDetails | null
}

export interface ExpenseForExport {
  id: string
  date: Date
  amount: number
  currency: string
  description: string | null
  expenseType: "fixed" | "variable" | null
  status: string
  vendor: {
    id: string
    name: string
  } | null
  category: {
    id: string
    name: string
    color: string
  } | null
  invoices: {
    id: string
    fileName: string
    filePath: string
    mimeType: string | null
  }[]
}

export async function getExpensesForExport(
  startDate: Date,
  endDate: Date
): Promise<ExpenseForExport[]> {
  const { organizationId } = await getAuthContext()

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: "excluded" },
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      invoices: {
        select: {
          id: true,
          fileName: true,
          filePath: true,
          mimeType: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })

  return expenses as unknown as ExpenseForExport[]
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

  console.log("[Export Preview Query] orgId:", organizationId, "dates:", { start: startDate, end: endDate })

  // Get expenses with invoice counts
  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: "excluded" },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  })

  console.log("[Export Preview Query] Found expenses:", expenses.length)

  // Calculate totals
  let totalAmount = 0
  let fixedAmount = 0
  let variableAmount = 0
  let invoiceCount = 0
  let currency = "EUR"

  const categoryMap = new Map<string, { name: string; amount: number; color: string }>()

  for (const expense of expenses) {
    totalAmount += expense.amount
    invoiceCount += expense._count.invoices
    currency = expense.currency

    if (expense.expenseType === "fixed") {
      fixedAmount += expense.amount
    } else {
      variableAmount += expense.amount
    }

    // Group by category
    const categoryKey = expense.category?.id || "uncategorized"
    const existing = categoryMap.get(categoryKey)
    if (existing) {
      existing.amount += expense.amount
    } else {
      categoryMap.set(categoryKey, {
        name: expense.category?.name || "Sin categoria",
        amount: expense.amount,
        color: expense.category?.color || "#888888",
      })
    }
  }

  // Sort categories by amount descending
  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.amount - a.amount
  )

  return {
    expenseCount: expenses.length,
    invoiceCount,
    totalAmount,
    fixedAmount,
    variableAmount,
    currency,
    categoryBreakdown,
  }
}
