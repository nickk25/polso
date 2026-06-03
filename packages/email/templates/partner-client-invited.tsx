import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface PartnerClientInvitedEmailProps {
  partnerName: string
  partnerOrgName: string
  clientName: string | null
  inviteUrl: string
  locale?: Locale
}

export default function PartnerClientInvitedEmail({
  partnerName,
  partnerOrgName,
  clientName,
  inviteUrl,
  locale = "es",
}: PartnerClientInvitedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("partnerClientInvited.preview", { partnerName, partnerOrgName })} locale={locale}>
      <Preview>
        {t("partnerClientInvited.preview", { partnerName, partnerOrgName })}
      </Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("partnerClientInvited.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("partnerClientInvited.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("partnerClientInvited.intro", { partnerName, partnerOrgName, clientName: clientName ?? "" })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("partnerClientInvited.description")}
      </Text>

      <Button
        href={inviteUrl}
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
        {t("partnerClientInvited.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("partnerClientInvited.footer")}
      </Text>
    </EmailLayout>
  )
}

PartnerClientInvitedEmail.PreviewProps = {
  partnerName: "María García",
  partnerOrgName: "Asesoría Pérez & Asociados",
  clientName: "Talleres Ruiz S.L.",
  inviteUrl: "https://app.polso.com/invite/abc123",
  locale: "es" as const,
} satisfies PartnerClientInvitedEmailProps
