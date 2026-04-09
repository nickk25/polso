import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendUp, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getIncomes, getIncomeStats } from "@/features/income/queries/get-income"
import { getActiveCategories } from "@/features/categories/queries/get-categories"
import { IncomeFilters } from "@/features/income/components/income-filters"
import { IncomeTable } from "@/features/income/components/income-table"
import { IncomePagination } from "@/features/income/components/income-pagination"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

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
    source?: string
    category?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function IncomePage({ searchParams }: PageProps) {
  const t = await getTranslations("income")
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const search = params.search || undefined
  const status = params.status || undefined
  const source = params.source || undefined
  const category = params.category || undefined
  const dateFrom = params.dateFrom || undefined
  const dateTo = params.dateTo || undefined

  const [{ incomes, total, pages }, stats, categories] = await Promise.all([
    getIncomes(
      {
        search,
        status,
        source,
        categoryId: category,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
      page,
      PAGE_SIZE
    ),
    getIncomeStats(),
    getActiveCategories(),
  ])

  const hasIncomes = incomes.length > 0
  const hasAnyIncomes = total > 0 || stats.totalThisMonth > 0

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
      {hasAnyIncomes && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("thisMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
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
                {t("monthOverMonth")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.monthOverMonthChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {stats.monthOverMonthChange >= 0 ? "+" : ""}{stats.monthOverMonthChange.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("transactions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.incomeCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {hasAnyIncomes && (
        <div className="flex items-center justify-between gap-4">
          <IncomeFilters
            search={search}
            status={status}
            source={source}
            category={category}
            dateFrom={dateFrom}
            dateTo={dateTo}
            categories={categories}
          />
        </div>
      )}

      {/* Income Table */}
      {hasIncomes ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeTable incomes={incomes} categories={categories} />
            <IncomePagination currentPage={page} totalPages={pages} total={total} />
          </CardContent>
        </Card>
      ) : hasAnyIncomes ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noMatchingIncome")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("tryAdjustingFilters")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("noIncomeYet")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("noIncomeDescription")}
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
