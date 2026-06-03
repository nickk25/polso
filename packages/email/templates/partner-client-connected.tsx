import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface PartnerClientConnectedEmailProps {
  partnerName: string
  clientName: string
  triggerEvent: "joined" | "first_bank"
  dashboardUrl: string
  locale?: Locale
}

export default function PartnerClientConnectedEmail({
  partnerName,
  clientName,
  triggerEvent,
  dashboardUrl,
  locale = "es",
}: PartnerClientConnectedEmailProps) {
  const t = getEmailTranslations(locale)
  const isJoined = triggerEvent === "joined"

  const subject = isJoined
    ? t("partnerClientConnected.subjectJoined", { clientName })
    : t("partnerClientConnected.subjectFirstBank", { clientName })

  const badge = isJoined
    ? t("partnerClientConnected.badgeJoined")
    : t("partnerClientConnected.badgeFirstBank")

  const heading = isJoined
    ? t("partnerClientConnected.headingJoined", { clientName })
    : t("partnerClientConnected.headingFirstBank", { clientName })

  const intro = isJoined
    ? t("partnerClientConnected.introJoined", { partnerName, clientName })
    : t("partnerClientConnected.introFirstBank", { partnerName, clientName })

  return (
    <EmailLayout preview={subject} locale={locale}>
      <Preview>{subject}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {badge}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {heading}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {intro}
      </Text>

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
        {t("partnerClientConnected.button")}
      </Button>
    </EmailLayout>
  )
}

PartnerClientConnectedEmail.PreviewProps = {
  partnerName: "María García",
  clientName: "Talleres Ruiz S.L.",
  triggerEvent: "joined" as const,
  dashboardUrl: "https://partner.polso.com/clients/abc123",
  locale: "es" as const,
} satisfies PartnerClientConnectedEmailProps
