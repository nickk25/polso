import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface WaitlistFounderEmailProps {
  name: string
  locale?: Locale
}

export default function WaitlistFounderEmail({
  name,
  locale = "en",
}: WaitlistFounderEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("waitlistFounder.preview")} locale={locale}>
      <Preview>{t("waitlistFounder.preview")}</Preview>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.greeting", { name })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.intro")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.building")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.batches")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.reply")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 4px 0", lineHeight: 1.6 }}>
        {t("waitlistFounder.signoff")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#18181B", margin: "0 0 0 0", lineHeight: 1.6, fontWeight: 500 }}>
        {t("waitlistFounder.name")}
      </Text>
      <Text style={{ fontSize: "13px", color: "#71717A", margin: "0" }}>
        {t("waitlistFounder.title")}
      </Text>
    </EmailLayout>
  )
}

WaitlistFounderEmail.PreviewProps = {
  name: "Alex",
  locale: "es" as const,
} satisfies WaitlistFounderEmailProps
