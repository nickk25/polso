import {
  ArrowRight,
  Bank,
  UploadSimple,
  Export,
  ArrowsLeftRight,
} from "@phosphor-icons/react/dist/ssr"
import { getUserProfile } from "@polso/auth/get-session"
import { getTranslations } from "next-intl/server"
import { getAccountsSummary } from "@/features/banking/queries/get-accounts"
import { getBurnRateAndRunway, getExpenseStatsForMonth, getIncomeStats } from "@/features/analytics/queries/get-analytics"
import { getAlerts } from "@/features/alerts/queries/get-alerts"
import { ChatInput } from "@/features/overview/components/chat-input"
import Link from "next/link"
import { Button } from "@polso/ui/button"
import { formatCurrency } from "@/lib/format-currency"

function KpiCell({ label, value, subLabel }: { label: string; value: React.ReactNode; subLabel: string }) {
  return (
    <div className="bg-card p-6 flex flex-col">
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold tabular-nums mt-2">{value}</div>
      <span className="mt-1 text-xs text-muted-foreground">{subLabel}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const [t, userProfile, accountsSummary, expenseStats, incomeStats, burnRateData, alertsResult] = await Promise.all([
    getTranslations("dashboard"),
    getUserProfile(),
    getAccountsSummary(),
    getExpenseStatsForMonth(),
    getIncomeStats(),
    getBurnRateAndRunway(),
    getAlerts({ isRead: false }, 1, 5),
  ])

  const currency = accountsSummary.currency || "EUR"
  const netCashFlow = incomeStats.totalThisMonth - expenseStats.total
  const hasActivityThisMonth = expenseStats.total > 0 || incomeStats.totalThisMonth > 0
  const unreadAlerts = alertsResult.alerts

  const firstName = (userProfile.name ?? userProfile.email?.split("@")[0] ?? "there").split(" ")[0]
  const hour = new Date().getHours()
  const greetingPrefix = hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening")

  return (
    // pt-[25vh]/md:pt-[420px]: visual center on mobile, fixed offset on desktop
    <div className="flex flex-col min-h-full max-w-3xl mx-auto w-full px-6 gap-10 pt-[25vh] md:pt-[420px]">

      {/* Hero */}
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">
            {greetingPrefix},{" "}
            <span className="italic font-serif">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActivityThisMonth ? t("hasTransactionsThisMonth") : t("noTransactionsThisMonth")}
          </p>
        </div>

        <ChatInput placeholder={t("chatPlaceholder")} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">
              <ArrowsLeftRight className="h-3.5 w-3.5" />
              {t("quickActions.addTransaction")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/banking">
              <Bank className="h-3.5 w-3.5" />
              {t("quickActions.connectBank")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vault">
              <UploadSimple className="h-3.5 w-3.5" />
              {t("quickActions.uploadReceipt")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/export">
              <Export className="h-3.5 w-3.5" />
              {t("quickActions.export")}
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="pb-8 flex flex-col gap-8 shrink-0">
        <div className="grid grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border">
          <KpiCell
            label={t("stats.cashBalance")}
            value={formatCurrency(accountsSummary.totalCurrent, currency)}
            subLabel={
              accountsSummary.accountCount === 0
                ? t("stats.noAccountsConnected")
                : t("stats.acrossAccounts", { count: accountsSummary.accountCount })
            }
          />
          <KpiCell
            label={t("stats.netCashflow")}
            value={
              <span className={netCashFlow >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow, currency)}
              </span>
            }
            subLabel={t("stats.thisMonth")}
          />
          <KpiCell
            label={t("stats.burnRate")}
            value={burnRateData.burnRate > 0 ? formatCurrency(burnRateData.burnRate, currency) : "—"}
            subLabel={t("stats.perMonth")}
          />
          <KpiCell
            label={t("stats.runway")}
            value={burnRateData.runway > 0 ? `${burnRateData.runway.toFixed(1)} mo` : "—"}
            subLabel={t("stats.atCurrentBurn")}
          />
        </div>

        {/* Alerts */}
        {unreadAlerts.length > 0 && (
          <div className="space-y-1.5 pb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("alerts.needsAttention")}</span>
              <Link href="/alerts" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                {t("alerts.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {unreadAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                  alert.severity === "critical" ? "bg-red-500"
                  : alert.severity === "warning" ? "bg-amber-400"
                  : "bg-blue-400"
                }`} />
                <p className="leading-snug">
                  <span className="text-xs font-medium text-foreground/80">{alert.title}</span>
                  {" "}
                  <span className="text-[11px] text-muted-foreground">{alert.message}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
