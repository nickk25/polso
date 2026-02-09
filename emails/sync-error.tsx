import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "@/lib/i18n/config"
import { getEmailTranslations } from "@/lib/i18n/email-translations"

interface SyncErrorEmailProps {
  name: string
  bankName: string
  errorMessage: string
  settingsUrl: string
  locale?: Locale
}

export default function SyncErrorEmail({
  name,
  bankName,
  errorMessage,
  settingsUrl,
  locale = "en",
}: SyncErrorEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("syncError.preview", { bankName })} locale={locale}>
      <Preview>{t("syncError.preview", { bankName })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("syncError.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("syncError.heading", { bankName })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("syncError.intro", { name, bankName })}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("syncError.errorDetailsLabel")}</Text>
            <Text style={{ fontSize: "13px", color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{errorMessage}</Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("syncError.resolution")}
      </Text>

      <Button
        href={settingsUrl}
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
        {t("syncError.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("syncError.footer")}
      </Text>
    </EmailLayout>
  )
}

SyncErrorEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  errorMessage: "ITEM_LOGIN_REQUIRED",
  settingsUrl: "https://polso.app/settings/banking",
  locale: "es" as const,
} satisfies SyncErrorEmailProps
