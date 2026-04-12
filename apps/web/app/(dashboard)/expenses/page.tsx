import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Receipt, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getExpenses, getExpenseStats } from "@/features/expenses/queries/get-expenses"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { ExpenseFilters } from "@/features/expenses/components/expense-filters"
import { ExpensePagination } from "@/features/expenses/components/expense-pagination"
import { ExpenseTable } from "@/features/expenses/components/expense-table"
import { AutoCategorizeButton } from "@/features/expenses/components/auto-categorize-button"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

const PAGE_SIZE = 25

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    expenseType?: string
    category?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const t = await getTranslations("expenses")
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const search = params.search || undefined
  const status = params.status || undefined
  const expenseType = params.expenseType || undefined
  const category = params.category || undefined
  const dateFrom = params.dateFrom || undefined
  const dateTo = params.dateTo || undefined

  const [{ expenses, total, pages }, stats, categories] = await Promise.all([
    getExpenses(
      {
        search,
        status,
        expenseType,
        categoryId: category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
      page,
      PAGE_SIZE
    ),
    getExpenseStats(),
    getActiveCategories(),
  ])

  const hasExpenses = expenses.length > 0
  const hasAnyExpenses = total > 0 || stats.totalThisMonth > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {total > 0
            ? t("transactionCount", { count: total })
            : t("subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      {hasAnyExpenses && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("thisMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalThisMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("lastMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalLastMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("fixed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(stats.fixedThisMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("variable")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {formatCurrency(stats.variableThisMonth)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {hasAnyExpenses && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <ExpenseFilters
              search={search}
              status={status}
              expenseType={expenseType}
              category={category}
              dateFrom={dateFrom}
              dateTo={dateTo}
              categories={categories}
            />
          </div>
          <AutoCategorizeButton />
        </div>
      )}

      {/* Expenses Table */}
      {hasExpenses ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseTable expenses={expenses} categories={categories} />
            <ExpensePagination currentPage={page} totalPages={pages} total={total} />
          </CardContent>
        </Card>
      ) : hasAnyExpenses ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noMatchingExpenses")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("tryAdjustingFilters")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noExpensesYet")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("noExpensesDescription")}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/settings/banking">
                {t("connectBank")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
