import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface UnusualActivityAlertEmailProps {
  name: string
  category: string
  amount: string
  averageAmount: string
  multiplier: string
  dashboardUrl: string
  locale?: Locale
}

export default function UnusualActivityAlertEmail({
  name,
  category,
  amount,
  averageAmount,
  multiplier,
  dashboardUrl,
  locale = "en",
}: UnusualActivityAlertEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("alertUnusualActivity.preview", { category })} locale={locale}>
      <Preview>{t("alertUnusualActivity.preview", { category })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("alertUnusualActivity.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("alertUnusualActivity.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("alertUnusualActivity.intro", { name, category, multiplier })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertUnusualActivity.thisExpenseLabel")}</Text>
                  <Text style={{ fontSize: "24px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{amount}</Text>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertUnusualActivity.yourAverageLabel")}</Text>
                  <Text style={{ fontSize: "14px", color: "#71717A", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{averageAmount}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("alertUnusualActivity.context")}
      </Text>

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
        {t("alertUnusualActivity.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("alertUnusualActivity.footer")}
      </Text>
    </EmailLayout>
  )
}

UnusualActivityAlertEmail.PreviewProps = {
  name: "Alex",
  category: "Office Supplies",
  amount: "€890",
  averageAmount: "€120",
  multiplier: "7",
  dashboardUrl: "https://polso.app/expenses",
  locale: "es" as const,
} satisfies UnusualActivityAlertEmailProps
