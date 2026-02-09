import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface BankDisconnectedEmailProps {
  name: string
  bankName: string
  reconnectUrl: string
  locale?: Locale
}

export default function BankDisconnectedEmail({
  name,
  bankName,
  reconnectUrl,
  locale = "en",
}: BankDisconnectedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("bankDisconnected.preview", { bankName })} locale={locale}>
      <Preview>{t("bankDisconnected.preview", { bankName })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("bankDisconnected.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("bankDisconnected.heading", { bankName })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("bankDisconnected.intro", { name, bankName })}
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("bankDisconnected.reasonsLabel")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankDisconnected.reason1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankDisconnected.reason2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankDisconnected.reason3")}
            </Text>
          </td>
        </tr>
      </table>

      <Button
        href={reconnectUrl}
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
        {t("bankDisconnected.button", { bankName })}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("bankDisconnected.footer")}
      </Text>
    </EmailLayout>
  )
}

BankDisconnectedEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  reconnectUrl: "https://polso.app/settings/banking",
  locale: "es" as const,
} satisfies BankDisconnectedEmailProps
