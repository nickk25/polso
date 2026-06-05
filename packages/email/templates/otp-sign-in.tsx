import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface OtpSignInEmailProps {
  code: string
  locale?: Locale
}

export default function OtpSignInEmail({ code, locale = "es" }: OtpSignInEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("otpSignIn.preview")} locale={locale}>
      <Preview>{t("otpSignIn.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("otpSignIn.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0", lineHeight: 1.3 }}>
        {t("otpSignIn.heading")}
      </Text>
      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 32px 0", lineHeight: 1.6 }}>
        {t("otpSignIn.intro")}
      </Text>

      {/* OTP Code */}
      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "32px" }}>
        <tr>
          <td style={{ backgroundColor: "#f4f4f5", padding: "28px 24px", textAlign: "center" }}>
            <Text style={{
              fontSize: "40px",
              fontWeight: 700,
              color: "#18181B",
              margin: 0,
              letterSpacing: "0.25em",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}>
              {code}
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "13px", color: "#71717A", margin: "0 0 8px 0" }}>
        {t("otpSignIn.expiry")}
      </Text>

      <Text style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
        {t("otpSignIn.footer")}
      </Text>
    </EmailLayout>
  )
}

OtpSignInEmail.PreviewProps = {
  code: "482916",
  locale: "es" as const,
} satisfies OtpSignInEmailProps
