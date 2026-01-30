import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface PaymentFailedEmailProps {
  name: string
  amount: string
  updatePaymentUrl: string
}

export default function PaymentFailedEmail({
  name,
  amount,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  return (
    <EmailLayout preview="Action required: Payment failed">
      <Preview>Action required: Payment failed</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Action required
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Payment failed
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, we couldn&apos;t process your payment of <span style={{ fontWeight: 600, color: "#dc2626", fontFamily: "'JetBrains Mono', monospace" }}>{amount}</span> for your Polso subscription.
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        This could happen if
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Your card expired
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Insufficient funds
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Card was declined by your bank
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Please update your payment method to keep your access.
      </Text>

      <Button
        href={updatePaymentUrl}
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
        Update Payment Method
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        We&apos;ll retry the payment in 3 days. If it fails again, your account will be downgraded.
      </Text>
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  name: "Alex",
  amount: "€23",
  updatePaymentUrl: "https://polso.app/settings/billing",
} satisfies PaymentFailedEmailProps
