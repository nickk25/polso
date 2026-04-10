import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface UserInvitedEmailProps {
  inviterName: string
  organizationName: string
  inviteUrl: string
  locale?: Locale
}

export default function UserInvitedEmail({
  inviterName,
  organizationName,
  inviteUrl,
  locale = "en",
}: UserInvitedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("userInvited.preview", { inviterName, organizationName })} locale={locale}>
      <Preview>
        {t("userInvited.preview", { inviterName, organizationName })}
      </Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("userInvited.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("userInvited.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        {t("userInvited.intro", { inviterName, organizationName })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("userInvited.description")}
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
        {t("userInvited.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("userInvited.footer")}
      </Text>
    </EmailLayout>
  )
}

UserInvitedEmail.PreviewProps = {
  inviterName: "Alex",
  organizationName: "Acme Inc",
  inviteUrl: "https://polso.app/invite/abc123",
  locale: "es" as const,
} satisfies UserInvitedEmailProps
