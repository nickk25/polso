import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface RunwayCriticalAlertEmailProps {
  name: string
  runwayMonths: string
  threshold: string
  currentBalance: string
  monthlyBurn: string
  dashboardUrl: string
  locale?: Locale
}

export default function RunwayCriticalAlertEmail({
  name,
  runwayMonths,
  threshold,
  currentBalance,
  monthlyBurn,
  dashboardUrl,
  locale = "en",
}: RunwayCriticalAlertEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("alertRunwayCritical.preview", { runwayMonths })} locale={locale}>
      <Preview>{t("alertRunwayCritical.preview", { runwayMonths })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("alertRunwayCritical.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("alertRunwayCritical.heading", { threshold })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("alertRunwayCritical.intro", { name, runwayMonths })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px", textAlign: "center", borderRight: "1px solid #e4e4e7" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertRunwayCritical.runwayLabel")}</Text>
            <Text style={{ fontSize: "28px", fontWeight: 600, color: "#dc2626", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{runwayMonths}<span style={{ fontSize: "14px", fontWeight: 400, color: "#71717A" }}>{t("alertRunwayCritical.runwayUnit")}</span></Text>
          </td>
          <td style={{ padding: "16px", textAlign: "center", borderRight: "1px solid #e4e4e7" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertRunwayCritical.balanceLabel")}</Text>
            <Text style={{ fontSize: "16px", fontWeight: 500, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{currentBalance}</Text>
          </td>
          <td style={{ padding: "16px", textAlign: "center" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertRunwayCritical.burnLabel")}</Text>
            <Text style={{ fontSize: "16px", fontWeight: 500, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{monthlyBurn}</Text>
          </td>
        </tr>
      </table>

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
        {t("alertRunwayCritical.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("alertRunwayCritical.footer")}
      </Text>
    </EmailLayout>
  )
}

RunwayCriticalAlertEmail.PreviewProps = {
  name: "Alex",
  runwayMonths: "2.3",
  threshold: "3",
  currentBalance: "€18,500",
  monthlyBurn: "€8,000",
  dashboardUrl: "https://polso.app/analytics",
  locale: "es" as const,
} satisfies RunwayCriticalAlertEmailProps
