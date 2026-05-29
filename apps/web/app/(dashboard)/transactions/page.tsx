import { getTranslations } from "next-intl/server"
import { getTransactions, getTransactionStats } from "@/features/transactions/queries/get-transactions"
import { TransactionTable } from "@/features/transactions/components/transaction-table"
import type { TransactionType } from "@/features/transactions/queries/get-transactions"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    status?: string
    search?: string
    page?: string
  }>
}) {
  const { type, status, search, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1)

  const typeFilter = (type as TransactionType | "all" | undefined) ?? "all"

  const [{ transactions, total, pages }, stats] = await Promise.all([
    getTransactions(
      {
        type: typeFilter,
        status: status && status !== "all" ? status : undefined,
        search: search || undefined,
      },
      page,
      50
    ),
    getTransactionStats(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-muted-foreground">All income and expenses in one view</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">This month — Income</p>
          <p className="text-xl font-bold text-green-500">
            +{formatCurrency(stats.totalIncome, stats.currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">This month — Expenses</p>
          <p className="text-xl font-bold text-red-500">
            -{formatCurrency(stats.totalExpenses, stats.currency)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Net cash flow</p>
          <p className={`text-xl font-bold ${stats.netFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
            {stats.netFlow >= 0 ? "+" : ""}{formatCurrency(stats.netFlow, stats.currency)}
          </p>
        </div>
      </div>

      <TransactionTable
        transactions={transactions}
        total={total}
        pages={pages}
        page={page}
        type={typeFilter}
        status={status ?? "all"}
        search={search ?? ""}
      />
    </div>
  )
}
