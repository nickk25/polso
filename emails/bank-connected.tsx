import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface BankConnectedEmailProps {
  name: string
  bankName: string
  accountCount: number
  dashboardUrl: string
}

export default function BankConnectedEmail({
  name,
  bankName,
  accountCount,
  dashboardUrl,
}: BankConnectedEmailProps) {
  return (
    <EmailLayout preview={`${bankName} connected successfully`}>
      <Preview>{bankName} connected successfully</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Bank sync
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {bankName} connected
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, <span style={{ fontWeight: 500, color: "#18181B" }}>{bankName}</span> is now connected to Polso. We&apos;ve synced <span style={{ fontWeight: 600, color: "#18181B", fontFamily: "'JetBrains Mono', monospace" }}>{accountCount}</span> account{accountCount > 1 ? "s" : ""}.
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        What happens next
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Your transactions are syncing now
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              We&apos;ll auto-categorize your expenses
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Daily syncs will keep everything up to date
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
        View Dashboard
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Your bank connection is read-only. We can never move money or make transactions.
      </Text>
    </EmailLayout>
  )
}

BankConnectedEmail.PreviewProps = {
  name: "Alex",
  bankName: "ING Direct",
  accountCount: 2,
  dashboardUrl: "https://polso.app/dashboard",
} satisfies BankConnectedEmailProps
