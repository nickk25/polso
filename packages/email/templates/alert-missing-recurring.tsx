import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface MissingRecurringAlertEmailProps {
  name: string
  vendorName: string
  expectedAmount: string
  expectedDate: string
  recurringUrl: string
  locale?: Locale
}

export default function MissingRecurringAlertEmail({
  name,
  vendorName,
  expectedAmount,
  expectedDate,
  recurringUrl,
  locale = "en",
}: MissingRecurringAlertEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("alertMissingRecurring.preview", { vendorName })} locale={locale}>
      <Preview>{t("alertMissingRecurring.preview", { vendorName })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("alertMissingRecurring.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("alertMissingRecurring.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("alertMissingRecurring.intro", { name, vendorName })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "12px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertMissingRecurring.vendorLabel")}</Text>
                  <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: 0 }}>{vendorName}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "12px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertMissingRecurring.expectedAmountLabel")}</Text>
                  <Text style={{ fontSize: "14px", color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{expectedAmount}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("alertMissingRecurring.expectedAroundLabel")}</Text>
                  <Text style={{ fontSize: "14px", color: "#18181B", margin: 0 }}>{expectedDate}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("alertMissingRecurring.reasonsLabel")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("alertMissingRecurring.reason1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("alertMissingRecurring.reason2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("alertMissingRecurring.reason3")}
            </Text>
          </td>
        </tr>
      </table>

      <Button
        href={recurringUrl}
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
        {t("alertMissingRecurring.button")}
      </Button>
    </EmailLayout>
  )
}

MissingRecurringAlertEmail.PreviewProps = {
  name: "Alex",
  vendorName: "AWS",
  expectedAmount: "€450",
  expectedDate: "January 28, 2026",
  recurringUrl: "https://polso.app/recurring",
  locale: "es" as const,
} satisfies MissingRecurringAlertEmailProps
