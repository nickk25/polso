import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface PaymentFailedEmailProps {
  name: string
  amount: string
  updatePaymentUrl: string
  locale?: Locale
}

export default function PaymentFailedEmail({
  name,
  amount,
  updatePaymentUrl,
  locale = "en",
}: PaymentFailedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("paymentFailed.preview")} locale={locale}>
      <Preview>{t("paymentFailed.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("paymentFailed.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("paymentFailed.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("paymentFailed.intro", { name, amount })}
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("paymentFailed.reasonsLabel")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("paymentFailed.reason1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("paymentFailed.reason2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("paymentFailed.reason3")}
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("paymentFailed.updatePrompt")}
      </Text>

      <Button
        href={updatePaymentUrl}
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
        {t("paymentFailed.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("paymentFailed.footer")}
      </Text>
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  name: "Alex",
  amount: "€23",
  updatePaymentUrl: "https://polso.app/settings/billing",
  locale: "es" as const,
} satisfies PaymentFailedEmailProps
