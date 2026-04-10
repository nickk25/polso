import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface TrialEndingEmailProps {
  name: string
  daysLeft: number
  trialEndDate: string
  upgradeUrl: string
  locale?: Locale
}

export default function TrialEndingEmail({
  name,
  daysLeft,
  trialEndDate,
  upgradeUrl,
  locale = "en",
}: TrialEndingEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("trialEnding.preview", { daysLeft })} locale={locale}>
      <Preview>{t("trialEnding.preview", { daysLeft })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("trialEnding.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("trialEnding.heading", { daysLeft })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("trialEnding.intro", { name, trialEndDate })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("trialEnding.keepClarity")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "12px", borderBottom: "1px solid #e4e4e7" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("trialEnding.starterName")}</Text>
                  <Text style={{ fontSize: "16px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{t("trialEnding.starterPrice")}<span style={{ fontWeight: 400, color: "#71717A", fontSize: "12px" }}>{t("trialEnding.starterPeriod")}</span></Text>
                  <Text style={{ fontSize: "12px", color: "#71717A", margin: "4px 0 0 0" }}>{t("trialEnding.starterDesc")}</Text>
                </td>
              </tr>
              <tr>
                <td style={{ paddingTop: "12px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("trialEnding.businessName")}</Text>
                  <Text style={{ fontSize: "16px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{t("trialEnding.businessPrice")}<span style={{ fontWeight: 400, color: "#71717A", fontSize: "12px" }}>{t("trialEnding.businessPeriod")}</span></Text>
                  <Text style={{ fontSize: "12px", color: "#71717A", margin: "4px 0 0 0" }}>{t("trialEnding.businessDesc")}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Button
        href={upgradeUrl}
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
        {t("trialEnding.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("trialEnding.footer")}
      </Text>
    </EmailLayout>
  )
}

TrialEndingEmail.PreviewProps = {
  name: "Alex",
  daysLeft: 3,
  trialEndDate: "February 14, 2026",
  upgradeUrl: "https://polso.app/settings/billing",
  locale: "es" as const,
} satisfies TrialEndingEmailProps
