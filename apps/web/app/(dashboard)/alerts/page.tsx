import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Card } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Bell, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr"
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
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/notifications">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t("configure")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.total")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.unread")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{stats.unread}</div>
        </Card>
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("stats.critical")}</div>
          <div className="px-4 pb-4 text-2xl font-bold text-destructive">{stats.critical}</div>
        </Card>
      </div>


      <div className="flex items-center gap-4">
        <AlertFilters type={type} severity={severity} status={statusParam} />
      </div>

      {/* Alerts Table */}
      {alerts.length > 0 ? (
        <>
          <AlertTable alerts={alerts} />
          <AlertPagination
            currentPage={page}
            totalPages={pages}
            total={total}
            pageSize={PAGE_SIZE}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t("empty.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {t("empty.description")}
          </p>
        </div>
      )}
    </div>
  )
}
