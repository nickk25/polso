import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface WelcomeEmailProps {
  name: string
  dashboardUrl: string
  locale?: Locale
}

export default function WelcomeEmail({ name, dashboardUrl, locale = "en" }: WelcomeEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("welcome.preview")} locale={locale}>
      <Preview>{t("welcome.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("welcome.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("welcome.heading", { name })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("welcome.intro")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "16px" }}>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>01</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>{t("welcome.step1Title")}</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>{t("welcome.step1Desc")}</Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "16px" }}>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>02</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>{t("welcome.step2Title")}</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>{t("welcome.step2Desc")}</Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>03</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>{t("welcome.step3Title")}</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>{t("welcome.step3Desc")}</Text>
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
        {t("welcome.button")}
      </Button>

      <Text style={{ fontSize: "13px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("welcome.footer")}
      </Text>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  name: "Alex",
  dashboardUrl: "https://polso.app/dashboard",
  locale: "es" as const,
} satisfies WelcomeEmailProps
