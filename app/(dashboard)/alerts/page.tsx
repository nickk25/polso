import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell } from "@phosphor-icons/react/dist/ssr"
import { getAlerts, getAlertStats } from "@/features/alerts/queries/get-alerts"
import { AlertTable } from "@/features/alerts/components/alert-table"
import { AlertFilters } from "@/features/alerts/components/alert-filters"
import { AlertPagination } from "@/features/alerts/components/alert-pagination"

const PAGE_SIZE = 25

interface PageProps {
  searchParams: Promise<{
    page?: string
    type?: string
    severity?: string
    status?: string
  }>
}

export default async function AlertsPage({ searchParams }: PageProps) {
  const t = await getTranslations("alerts")
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const type = params.type || undefined
  const severity = params.severity || undefined
  const statusParam = params.status || undefined

  const isRead =
    statusParam === "read" ? true : statusParam === "unread" ? false : undefined

  const [{ alerts, total, pages }, stats] = await Promise.all([
    getAlerts({ type, severity, isRead }, page, PAGE_SIZE),
    getAlertStats(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.unread")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {stats.unread}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.critical")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.critical}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <AlertFilters type={type} severity={severity} status={statusParam} />
      </div>

      {/* Alerts Table */}
      {alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTable alerts={alerts} />
            <AlertPagination
              currentPage={page}
              totalPages={pages}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
