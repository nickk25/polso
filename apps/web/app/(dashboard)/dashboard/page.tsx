import { getUserProfile } from "@polso/auth/get-session"
import { getTranslations } from "next-intl/server"
import { getAccountsSummary } from "@/features/banking/queries/get-accounts"
import { getBurnRateAndRunway, getExpenseStatsForMonth, getIncomeStats, getVATSummary } from "@/features/analytics/queries/get-analytics"
import { getAlerts } from "@/features/alerts/queries/get-alerts"
import { AgentSurface } from "@/features/agent/components/agent-surface"

export default async function DashboardPage() {
  const [t, userProfile, accountsSummary, expenseStats, incomeStats, burnRateData, alertsResult, vatSummary] = await Promise.all([
    getTranslations("dashboard"),
    getUserProfile(),
    getAccountsSummary(),
    getExpenseStatsForMonth(),
    getIncomeStats(),
    getBurnRateAndRunway(),
    getAlerts({ isRead: false }, 1, 5),
    getVATSummary(),
  ])

  const currency = accountsSummary.currency || "EUR"
  const netCashFlow = incomeStats.totalThisMonth - expenseStats.total
  const hasActivityThisMonth = expenseStats.total > 0 || incomeStats.totalThisMonth > 0

  const firstName = (userProfile.name ?? userProfile.email?.split("@")[0] ?? "there").split(" ")[0]
  const hour = new Date().getHours()
  const greetingPrefix = hour < 12 ? t("greetingMorning") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening")

  return (
    <AgentSurface
      greeting={greetingPrefix}
      firstName={firstName}
      hasActivityThisMonth={hasActivityThisMonth}
      kpi={{
        cashBalance: accountsSummary.totalCurrent,
        netCashFlow,
        burnRate: burnRateData.burnRate,
        runway: burnRateData.runway,
        currency,
        vatCurrentQuarterNet: vatSummary.ytdCollected > 0 || vatSummary.ytdPaid > 0 ? vatSummary.currentQuarter.net : null,
        vatCurrentQuarterLabel: `Q${vatSummary.currentQuarter.quarter} ${vatSummary.year}`,
      }}
      unreadAlerts={alertsResult.alerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        message: a.message,
      }))}
    />
  )
}
