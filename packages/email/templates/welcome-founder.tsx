import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface WelcomeFounderEmailProps {
  name: string
  locale?: Locale
}

export default function WelcomeFounderEmail({
  name,
  locale = "en",
}: WelcomeFounderEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("welcomeFounder.preview")} locale={locale}>
      <Preview>{t("welcomeFounder.preview")}</Preview>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.greeting", { name })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.intro")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.why")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.value")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.reply")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 4px 0", lineHeight: 1.6 }}>
        {t("welcomeFounder.signoff")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#18181B", margin: "0 0 0 0", lineHeight: 1.6, fontWeight: 500 }}>
        {t("welcomeFounder.name")}
      </Text>
      <Text style={{ fontSize: "13px", color: "#71717A", margin: "0" }}>
        {t("welcomeFounder.title")}
      </Text>
    </EmailLayout>
  )
}

WelcomeFounderEmail.PreviewProps = {
  name: "Alex",
  locale: "es" as const,
} satisfies WelcomeFounderEmailProps
