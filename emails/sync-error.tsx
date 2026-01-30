import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface SyncErrorEmailProps {
  name: string
  bankName: string
  errorMessage: string
  settingsUrl: string
}

export default function SyncErrorEmail({
  name,
  bankName,
  errorMessage,
  settingsUrl,
}: SyncErrorEmailProps) {
  return (
    <EmailLayout preview={`Sync error with ${bankName}`}>
      <Preview>Sync error with {bankName}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Sync error
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Unable to sync {bankName}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, we&apos;ve been unable to sync transactions from <span style={{ fontWeight: 500, color: "#18181B" }}>{bankName}</span> for the past 3 attempts.
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Error details</Text>
            <Text style={{ fontSize: "13px", color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{errorMessage}</Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        This might resolve itself, but if it persists you may need to reconnect your bank.
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
        Check Bank Connection
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Need help? Reply to this email and we&apos;ll assist you.
      </Text>
    </EmailLayout>
  )
}

SyncErrorEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  errorMessage: "ITEM_LOGIN_REQUIRED",
  settingsUrl: "https://polso.app/settings/banking",
} satisfies SyncErrorEmailProps
