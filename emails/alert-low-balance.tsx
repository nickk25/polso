import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface LowBalanceAlertEmailProps {
  name: string
  accountName: string
  currentBalance: string
  threshold: string
  dashboardUrl: string
}

export default function LowBalanceAlertEmail({
  name,
  accountName,
  currentBalance,
  threshold,
  dashboardUrl,
}: LowBalanceAlertEmailProps) {
  return (
    <EmailLayout preview={`Low balance alert: ${accountName}`}>
      <Preview>Low balance alert: {accountName}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Alert
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Low balance on {accountName}
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, your account has dropped below your configured threshold.
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa", padding: "16px" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current balance</Text>
                  <Text style={{ fontSize: "24px", fontWeight: 600, color: "#dc2626", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{currentBalance}</Text>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Threshold</Text>
                  <Text style={{ fontSize: "14px", color: "#71717A", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{threshold}</Text>
                </td>
              </tr>
            </table>
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
        View Dashboard
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Adjust thresholds in Settings → Notifications.
      </Text>
    </EmailLayout>
  )
}

LowBalanceAlertEmail.PreviewProps = {
  name: "Alex",
  accountName: "ING Business Account",
  currentBalance: "€2,450",
  threshold: "€5,000",
  dashboardUrl: "https://polso.app/dashboard",
} satisfies LowBalanceAlertEmailProps
