import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface SubscriptionConfirmedEmailProps {
  name: string
  planName: string
  amount: string
  nextBillingDate: string
  dashboardUrl: string
}

export default function SubscriptionConfirmedEmail({
  name,
  planName,
  amount,
  nextBillingDate,
  dashboardUrl,
}: SubscriptionConfirmedEmailProps) {
  return (
    <EmailLayout preview="Your Polso subscription is active">
      <Preview>Your Polso subscription is active</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Subscription
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        You&apos;re all set, {name}.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Payment successful. Welcome to Polso {planName}.
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "12px" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</Text>
            <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: 0 }}>{planName}</Text>
          </td>
          <td style={{ paddingBottom: "12px", textAlign: "right" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</Text>
            <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{amount}<span style={{ fontWeight: 400, color: "#71717A" }}>/mo</span></Text>
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={{ borderTop: "1px solid #e4e4e7", paddingTop: "12px" }}>
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next billing</Text>
            <Text style={{ fontSize: "14px", color: "#3f3f46", margin: 0 }}>{nextBillingDate}</Text>
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

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Manage subscription in Settings → Billing.
      </Text>
    </EmailLayout>
  )
}

SubscriptionConfirmedEmail.PreviewProps = {
  name: "Alex",
  planName: "Starter",
  amount: "€23",
  nextBillingDate: "March 1, 2026",
  dashboardUrl: "https://polso.app/dashboard",
} satisfies SubscriptionConfirmedEmailProps
