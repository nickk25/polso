import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface WaitlistConfirmationEmailProps {
  email: string
  locale?: Locale
}

export default function WaitlistConfirmationEmail({
  email,
  locale = "en",
}: WaitlistConfirmationEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("waitlistConfirmation.preview")} locale={locale}>
      <Preview>{t("waitlistConfirmation.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("waitlistConfirmation.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("waitlistConfirmation.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("waitlistConfirmation.intro")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("waitlistConfirmation.notifyAt", { email })}
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("waitlistConfirmation.whatYouGet")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("waitlistConfirmation.feature1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("waitlistConfirmation.feature2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("waitlistConfirmation.feature3")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("waitlistConfirmation.feature4")}
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>
        {t("waitlistConfirmation.closing")}
      </Text>
    </EmailLayout>
  )
}

WaitlistConfirmationEmail.PreviewProps = {
  email: "founder@startup.com",
  locale: "es" as const,
} satisfies WaitlistConfirmationEmailProps
