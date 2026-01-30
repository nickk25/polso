import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface BankDisconnectedEmailProps {
  name: string
  bankName: string
  reconnectUrl: string
}

export default function BankDisconnectedEmail({
  name,
  bankName,
  reconnectUrl,
}: BankDisconnectedEmailProps) {
  return (
    <EmailLayout preview={`Action required: ${bankName} disconnected`}>
      <Preview>Action required: {bankName} disconnected</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Action required
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {bankName} disconnected
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, your connection to <span style={{ fontWeight: 500, color: "#18181B" }}>{bankName}</span> has been lost. Until reconnected, we can&apos;t sync new transactions.
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        This usually happens when
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Your bank requires re-authentication
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Your bank credentials changed
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              The bank temporarily revoked API access
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
        Reconnect {bankName}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        This takes less than a minute. Your historical data is safe.
      </Text>
    </EmailLayout>
  )
}

BankDisconnectedEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  reconnectUrl: "https://polso.app/settings/banking",
} satisfies BankDisconnectedEmailProps
