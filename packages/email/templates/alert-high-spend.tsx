import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface HighSpendAlertEmailProps {
  name: string
  category: string
  amount: string
  threshold: string
  period: string
  dashboardUrl: string
  locale?: Locale
}

export default function HighSpendAlertEmail({
  name,
  category,
  amount,
  threshold,
  period,
  dashboardUrl,
  locale = "en",
}: HighSpendAlertEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("alertHighSpend.preview", { category })} locale={locale}>
      <Preview>{t("alertHighSpend.preview", { category })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("alertHighSpend.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("alertHighSpend.heading", { category })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("alertHighSpend.intro", { name, category, period })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertHighSpend.currentSpendLabel")}</Text>
                  <Text style={{ fontSize: "24px", fontWeight: 600, color: "#dc2626", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{amount}</Text>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertHighSpend.thresholdLabel")}</Text>
                  <Text style={{ fontSize: "14px", color: "#71717A", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{threshold}</Text>
                </td>
              </tr>
            </table>
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
        {t("alertHighSpend.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("alertHighSpend.footer")}
      </Text>
    </EmailLayout>
  )
}

HighSpendAlertEmail.PreviewProps = {
  name: "Alex",
  category: "Software & SaaS",
  amount: "€1,850",
  threshold: "€1,500",
  period: "this month",
  dashboardUrl: "https://polso.app/expenses",
  locale: "es" as const,
} satisfies HighSpendAlertEmailProps
