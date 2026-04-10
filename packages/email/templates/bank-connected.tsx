import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface BankConnectedEmailProps {
  name: string
  bankName: string
  accountCount: number
  dashboardUrl: string
  locale?: Locale
}

export default function BankConnectedEmail({
  name,
  bankName,
  accountCount,
  dashboardUrl,
  locale = "en",
}: BankConnectedEmailProps) {
  const t = getEmailTranslations(locale)

  return (
    <EmailLayout preview={t("bankConnected.preview", { bankName })} locale={locale}>
      <Preview>{t("bankConnected.preview", { bankName })}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("bankConnected.badge")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {t("bankConnected.heading", { bankName })}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        {t("bankConnected.intro", { name, bankName, accountCount })}
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {t("bankConnected.nextLabel")}
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankConnected.step1")}
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankConnected.step2")}
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              {t("bankConnected.step3")}
            </Text>
          </td>
        </tr>
      </table>

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
        {t("bankConnected.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("bankConnected.footer")}
      </Text>
    </EmailLayout>
  )
}

BankConnectedEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  accountCount: 2,
  dashboardUrl: "https://polso.app/dashboard",
  locale: "es" as const,
} satisfies BankConnectedEmailProps
