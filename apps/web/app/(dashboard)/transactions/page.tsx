import { Card, CardContent } from "@polso/ui/card"
import { Receipt } from "@phosphor-icons/react/dist/ssr"
import { getTransactions, getTransactionStats } from "@/features/transactions/queries/get-transactions"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { getAccounts } from "@/features/banking/queries/get-accounts"
import { TransactionFilters } from "@/features/transactions/components/transaction-filters"
import { TransactionTable } from "@/features/transactions/components/transaction-table"
import { TransactionEmptyState } from "@/features/transactions/components/transaction-empty-state"
import { getTranslations } from "next-intl/server"
import { formatCurrency } from "@/lib/format-currency"

const PAGE_SIZE = 25

interface PageProps {
  searchParams: Promise<{
    type?: string
    page?: string
    search?: string
    status?: string
    category?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const direction = (params.type as "all" | "expense" | "income") || "all"
  const page = parseInt(params.page || "1", 10)
  const search = params.search || undefined
  const status = params.status || undefined
  const category = params.category || undefined
  const dateFrom = params.dateFrom || undefined
  const dateTo = params.dateTo || undefined

  const [t, categories, { transactions, total, pages }, stats, accounts] = await Promise.all([
    getTranslations("transactions"),
    getActiveCategories(),
    getTransactions(
      {
        direction,
        search,
        status,
        categoryId: category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
      page,
      PAGE_SIZE,
    ),
    getTransactionStats(),
    getAccounts(),
  ])

  const hasTransactions = transactions.length > 0
  const hasAny = total > 0 || stats.totalExpenses > 0 || stats.totalIncome > 0
  const hasConnectedBank = accounts.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {hasAny && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.income")}</div>
            <div className="px-4 pb-4 text-2xl font-bold text-green-500">{formatCurrency(stats.totalIncome, stats.currency)}</div>
          </Card>
          <Card>
            <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.expenses")}</div>
            <div className="px-4 pb-4 text-2xl font-bold">{formatCurrency(stats.totalExpenses, stats.currency)}</div>
          </Card>
          <Card>
            <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.netCashFlow")}</div>
            <div className={`px-4 pb-4 text-2xl font-bold ${stats.netFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(stats.netFlow, stats.currency)}
            </div>
          </Card>
        </div>
      )}

      {hasAny && (
        <div className="flex items-center justify-between gap-4">
          <TransactionFilters
            search={search}
            type={direction !== "all" ? direction : undefined}
            status={status}
            category={category}
            dateFrom={dateFrom}
            dateTo={dateTo}
            categories={categories}
          />
        </div>
      )}

      {hasTransactions ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            <TransactionTable
              transactions={transactions}
              total={total}
              pages={pages}
              page={page}
              categories={categories}
            />
          </CardContent>
        </Card>
      ) : hasAny ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("table.noTransactions")}</h3>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <TransactionEmptyState hasConnectedBank={hasConnectedBank} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
