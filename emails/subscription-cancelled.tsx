import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface SubscriptionCancelledEmailProps {
  name: string
  accessEndDate: string
  resubscribeUrl: string
}

export default function SubscriptionCancelledEmail({
  name,
  accessEndDate,
  resubscribeUrl,
}: SubscriptionCancelledEmailProps) {
  return (
    <EmailLayout preview="Your Polso subscription has been cancelled">
      <Preview>Your Polso subscription has been cancelled</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Subscription
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Subscription cancelled
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, your Polso subscription has been cancelled. You&apos;ll continue to have access until <span style={{ fontWeight: 500, color: "#18181B" }}>{accessEndDate}</span>.
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        After that date
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              You won&apos;t be able to access your dashboard
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Bank syncing will stop
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Your data will be kept for 30 days
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Changed your mind? You can resubscribe anytime.
      </Text>

      <Button
        href={resubscribeUrl}
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
        Resubscribe
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        We&apos;d love to hear why you&apos;re leaving. Just reply to this email.
      </Text>
    </EmailLayout>
  )
}

SubscriptionCancelledEmail.PreviewProps = {
  name: "Alex",
  accessEndDate: "March 1, 2026",
  resubscribeUrl: "https://polso.app/settings/billing",
} satisfies SubscriptionCancelledEmailProps
