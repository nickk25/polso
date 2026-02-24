import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TrendUp, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getIncomes, getIncomeStats } from "@/features/income/queries/get-income"
import { IncomeFilters } from "@/features/income/components/income-filters"
import { IncomePagination } from "@/features/income/components/income-pagination"
import { format } from "date-fns"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

const PAGE_SIZE = 25

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="default">{t("statuses.confirmed")}</Badge>
    case "excluded":
      return <Badge variant="secondary">{t("statuses.excluded")}</Badge>
    case "pending":
    default:
      return <Badge variant="outline">{t("statuses.pending")}</Badge>
  }
}

function getSourceBadge(source: string, t: (key: string) => string) {
  const sourceConfig: Record<string, { className: string; label: string }> = {
    salary: { className: "bg-green-500/10 text-green-500 border-green-500/20", label: t("sources.salary") },
    freelance: { className: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: t("sources.freelance") },
    investment: { className: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: t("sources.investment") },
    refund: { className: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: t("sources.refund") },
    transfer: { className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", label: t("sources.transfer") },
    other: { className: "bg-gray-500/10 text-gray-500 border-gray-500/20", label: t("sources.other") },
  }

  const config = sourceConfig[source] || sourceConfig.other
  return <Badge variant="secondary" className={config.className}>{config.label}</Badge>
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    source?: string
  }>
}

export default async function IncomePage({ searchParams }: PageProps) {
  const t = await getTranslations("income")
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const search = params.search || undefined
  const status = params.status || undefined
  const source = params.source || undefined

  const [{ incomes, total, pages }, stats] = await Promise.all([
    getIncomes({ search, status, source }, page, PAGE_SIZE),
    getIncomeStats(),
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
        <IncomeFilters search={search} status={status} source={source} />
      )}

      {/* Income Table */}
      {hasIncomes ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tableHeaders.date")}</TableHead>
                  <TableHead>{t("tableHeaders.description")}</TableHead>
                  <TableHead>{t("tableHeaders.category")}</TableHead>
                  <TableHead>{t("tableHeaders.source")}</TableHead>
                  <TableHead className="text-right">{t("tableHeaders.amount")}</TableHead>
                  <TableHead>{t("tableHeaders.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">
                      {format(new Date(income.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {income.transaction?.merchantName ||
                            income.transaction?.name ||
                            income.description ||
                            "Unknown"}
                        </span>
                        {income.transaction?.category && (
                          <span className="text-xs text-muted-foreground">
                            {income.transaction.category}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {income.category ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: income.category.color }}
                          />
                          <span>{income.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getSourceBadge(income.source, t)}</TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      +{formatCurrency(income.amount, income.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(income.status, t)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
