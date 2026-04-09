import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface SubscriptionCancelledEmailProps {
  name: string
  accessEndDate: string
  resubscribeUrl: string
  locale?: Locale
}

export default function SubscriptionCancelledEmail({
  name,
  accessEndDate,
  resubscribeUrl,
  locale = "en",
}: SubscriptionCancelledEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("subscriptionCancelled.preview")} locale={locale}>
      <Preview>{t("subscriptionCancelled.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("subscriptionCancelled.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("subscriptionCancelled.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("subscriptionCancelled.intro", { name, accessEndDate })}
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("subscriptionCancelled.afterDateLabel")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("subscriptionCancelled.consequence1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("subscriptionCancelled.consequence2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("subscriptionCancelled.consequence3")}
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("subscriptionCancelled.resubscribePrompt")}
      </Text>

      <Button
        href={resubscribeUrl}
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
        {t("subscriptionCancelled.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("subscriptionCancelled.footer")}
      </Text>
    </EmailLayout>
  )
}

SubscriptionCancelledEmail.PreviewProps = {
  name: "Alex",
  accessEndDate: "March 1, 2026",
  resubscribeUrl: "https://polso.app/settings/billing",
  locale: "es" as const,
} satisfies SubscriptionCancelledEmailProps
