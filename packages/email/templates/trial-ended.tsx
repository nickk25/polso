import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface TrialEndedEmailProps {
  name: string
  upgradeUrl: string
  locale?: Locale
}

export default function TrialEndedEmail({
  name,
  upgradeUrl,
  locale = "en",
}: TrialEndedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("trialEnded.preview")} locale={locale}>
      <Preview>{t("trialEnded.preview")}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("trialEnded.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("trialEnded.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("trialEnded.intro", { name })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("trialEnded.cta")}
      </Text>

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
        {t("trialEnded.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("trialEnded.dataRetention")}
      </Text>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "12px 0 0 0" }}>
        {t("trialEnded.footer")}
      </Text>
    </EmailLayout>
  )
}

TrialEndedEmail.PreviewProps = {
  name: "Alex",
  upgradeUrl: "https://polso.app/settings/billing",
  locale: "es" as const,
} satisfies TrialEndedEmailProps
