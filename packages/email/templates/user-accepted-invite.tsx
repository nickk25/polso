import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface UserAcceptedInviteEmailProps {
  name: string
  newMemberName: string
  newMemberEmail: string
  organizationName: string
  teamUrl: string
  locale?: Locale
}

export default function UserAcceptedInviteEmail({
  name,
  newMemberName,
  newMemberEmail,
  organizationName,
  teamUrl,
  locale = "en",
}: UserAcceptedInviteEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("userAcceptedInvite.preview", { newMemberName, organizationName })} locale={locale}>
      <Preview>
        {t("userAcceptedInvite.preview", { newMemberName, organizationName })}
      </Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("userAcceptedInvite.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("userAcceptedInvite.heading")}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("userAcceptedInvite.intro", { name, newMemberName, newMemberEmail, organizationName })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "8px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("userAcceptedInvite.nameLabel")}</Text>
                  <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: 0 }}>{newMemberName}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("userAcceptedInvite.emailLabel")}</Text>
                  <Text style={{ fontSize: "14px", color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{newMemberEmail}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("userAcceptedInvite.accessNote")}
      </Text>

      <Button
        href={teamUrl}
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
        {t("userAcceptedInvite.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("userAcceptedInvite.footer")}
      </Text>
    </EmailLayout>
  )
}

UserAcceptedInviteEmail.PreviewProps = {
  name: "Alex",
  newMemberName: "Jordan",
  newMemberEmail: "jordan@acme.com",
  organizationName: "Acme Inc",
  teamUrl: "https://polso.app/settings/organization",
  locale: "es" as const,
} satisfies UserAcceptedInviteEmailProps
