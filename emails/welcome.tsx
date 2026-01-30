import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface WelcomeEmailProps {
  name: string
  dashboardUrl: string
}

export default function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to Polso - Let's get started">
      <Preview>Welcome to Polso - Let&apos;s get started</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Welcome
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        You&apos;re in, {name}.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Your account is ready. Here&apos;s what to do next:
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "16px" }}>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>01</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>Connect your bank</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>Securely link via Open Banking. Takes 2 minutes.</Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "16px" }}>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>02</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>Watch the magic</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>Transactions sync and auto-categorize.</Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "12px", fontWeight: 600, color: "#18181B", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>03</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: "0 0 2px 0" }}>Know your numbers</Text>
            <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>See runway, burn rate, and cash flow in real-time.</Text>
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
        Go to Dashboard
      </Button>

      <Text style={{ fontSize: "13px", color: "#71717A", margin: "24px 0 0 0" }}>
        Questions? Just reply to this email.
      </Text>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  name: "Alex",
  dashboardUrl: "https://polso.app/dashboard",
} satisfies WelcomeEmailProps
