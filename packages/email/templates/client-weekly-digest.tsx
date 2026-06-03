import { Preview, Text, Button, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface TopCategory {
  name: string
  amount: number
}

interface AccountBalance {
  name: string
  balance: number
  currency: string
}

interface AlertItem {
  type: string
  title: string
  severity: string
}

interface LargeTransaction {
  description: string
  amount: number
  date: Date
}

interface ClientWeeklyDigestEmailProps {
  name: string
  orgName: string
  periodLabel: string
  totalSpend: number
  priorSpend: number
  deltaPct: number
  topCategories: TopCategory[]
  accountBalances: AccountBalance[]
  unmatchedReceiptsCount: number
  alertsTriggered: AlertItem[]
  largeTransactions: LargeTransaction[]
  currency: string
  dashboardUrl: string
  locale?: Locale
}

const cellStyle = { fontSize: "13px", color: "#3f3f46", padding: "6px 0", borderBottom: "1px solid #f4f4f5" }
const headerStyle = { fontSize: "11px", color: "#a1a1aa", padding: "4px 0 6px", textTransform: "uppercase" as const, letterSpacing: "0.08em" }

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ClientWeeklyDigestEmail({
  name,
  orgName,
  periodLabel,
  totalSpend,
  priorSpend,
  deltaPct,
  topCategories,
  accountBalances,
  unmatchedReceiptsCount,
  alertsTriggered,
  largeTransactions,
  currency,
  dashboardUrl,
  locale = "es",
}: ClientWeeklyDigestEmailProps) {
  const t = getEmailTranslations(locale)
  const subject = t("clientWeeklyDigest.subject", { orgName })
  const deltaSign = deltaPct > 0 ? "+" : ""
  const deltaLabel = `${deltaSign}${Math.round(deltaPct)}%`
  const hasActivity = topCategories.length > 0 || alertsTriggered.length > 0 || unmatchedReceiptsCount > 0

  return (
    <EmailLayout preview={subject} locale={locale}>
      <Preview>{subject}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("clientWeeklyDigest.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", lineHeight: 1.3 }}>
        {t("clientWeeklyDigest.heading")}
      </Text>
      <Text style={{ fontSize: "13px", color: "#71717a", margin: "0 0 24px 0" }}>
        {t("clientWeeklyDigest.intro", { name, periodLabel })}
      </Text>

      {/* Spend summary */}
      <Section style={{ margin: "0 0 24px 0" }}>
        <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
          {t("clientWeeklyDigest.spendTitle")}
        </Text>
        <Row>
          <Column style={{ ...cellStyle, width: "60%" }}>{t("clientWeeklyDigest.spendThisWeek")}</Column>
          <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{formatAmount(totalSpend, currency)}</Column>
        </Row>
        <Row>
          <Column style={{ ...cellStyle, width: "60%" }}>{t("clientWeeklyDigest.spendPriorWeek")}</Column>
          <Column style={{ ...cellStyle, textAlign: "right" as const }}>{formatAmount(priorSpend, currency)}</Column>
        </Row>
        {priorSpend > 0 && (
          <Row>
            <Column style={{ ...cellStyle, width: "60%" }}>{t("clientWeeklyDigest.spendChange")}</Column>
            <Column style={{ ...cellStyle, textAlign: "right" as const, color: deltaPct > 0 ? "#ef4444" : "#22c55e" }}>
              {deltaLabel}
            </Column>
          </Row>
        )}
      </Section>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("clientWeeklyDigest.categoriesTitle")}
          </Text>
          <Row>
            <Column style={{ ...headerStyle, width: "60%" }}>{t("clientWeeklyDigest.categoryColumn")}</Column>
            <Column style={{ ...headerStyle, textAlign: "right" as const }}>{t("clientWeeklyDigest.amountColumn")}</Column>
          </Row>
          {topCategories.map((c, i) => (
            <Row key={i}>
              <Column style={{ ...cellStyle, width: "60%" }}>{c.name}</Column>
              <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{formatAmount(c.amount, currency)}</Column>
            </Row>
          ))}
        </Section>
      )}

      {/* Account balances */}
      {accountBalances.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("clientWeeklyDigest.balancesTitle")}
          </Text>
          <Row>
            <Column style={{ ...headerStyle, width: "60%" }}>{t("clientWeeklyDigest.accountColumn")}</Column>
            <Column style={{ ...headerStyle, textAlign: "right" as const }}>{t("clientWeeklyDigest.balanceColumn")}</Column>
          </Row>
          {accountBalances.map((a, i) => (
            <Row key={i}>
              <Column style={{ ...cellStyle, width: "60%" }}>{a.name}</Column>
              <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{formatAmount(a.balance, a.currency)}</Column>
            </Row>
          ))}
        </Section>
      )}

      {/* Unmatched receipts callout */}
      {unmatchedReceiptsCount > 0 && (
        <Section style={{ margin: "0 0 24px 0", backgroundColor: "#fafafa", padding: "12px 16px", borderLeft: "3px solid #f59e0b" }}>
          <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
            {t("clientWeeklyDigest.unmatchedReceipts", { count: String(unmatchedReceiptsCount) })}
          </Text>
        </Section>
      )}

      {/* Alerts triggered */}
      {alertsTriggered.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("clientWeeklyDigest.alertsTitle")}
          </Text>
          {alertsTriggered.map((a, i) => (
            <Row key={i}>
              <Column style={cellStyle}>{a.title}</Column>
            </Row>
          ))}
        </Section>
      )}

      {/* Large transactions */}
      {largeTransactions.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("clientWeeklyDigest.largeTransactionsTitle")}
          </Text>
          <Row>
            <Column style={{ ...headerStyle, width: "60%" }}>{t("clientWeeklyDigest.descriptionColumn")}</Column>
            <Column style={{ ...headerStyle, textAlign: "right" as const }}>{t("clientWeeklyDigest.amountColumn")}</Column>
          </Row>
          {largeTransactions.map((tx, i) => (
            <Row key={i}>
              <Column style={{ ...cellStyle, width: "60%" }}>{tx.description || "—"}</Column>
              <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{formatAmount(tx.amount, currency)}</Column>
            </Row>
          ))}
        </Section>
      )}

      {!hasActivity && (
        <Text style={{ fontSize: "14px", color: "#71717a", margin: "0 0 24px 0" }}>
          {t("clientWeeklyDigest.noActivity")}
        </Text>
      )}

      <Button
        href={dashboardUrl}
        style={{
          backgroundColor: "#18181B",
          color: "#ffffff",
          padding: "12px 20px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {t("clientWeeklyDigest.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("clientWeeklyDigest.footer")}
      </Text>
    </EmailLayout>
  )
}

ClientWeeklyDigestEmail.PreviewProps = {
  name: "María García",
  orgName: "Taller López S.L.",
  periodLabel: "esta semana",
  totalSpend: 4320,
  priorSpend: 3800,
  deltaPct: 13.7,
  topCategories: [
    { name: "Suministros", amount: 1800 },
    { name: "Nóminas", amount: 1200 },
    { name: "Servicios", amount: 700 },
  ],
  accountBalances: [
    { name: "Cuenta Principal", balance: 12400, currency: "EUR" },
    { name: "Cuenta Ahorro", balance: 3200, currency: "EUR" },
  ],
  unmatchedReceiptsCount: 3,
  alertsTriggered: [
    { type: "high_expense", title: "High spend: Suministros", severity: "warning" },
  ],
  largeTransactions: [
    { description: "Compra materiales", amount: 1200, date: new Date() },
    { description: "Seguro empresa", amount: 980, date: new Date() },
  ],
  currency: "EUR",
  dashboardUrl: "https://app.polso.com/dashboard",
  locale: "es" as const,
} satisfies ClientWeeklyDigestEmailProps
