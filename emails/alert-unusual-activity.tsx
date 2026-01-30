import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface UnusualActivityAlertEmailProps {
  name: string
  category: string
  amount: string
  averageAmount: string
  multiplier: string
  dashboardUrl: string
}

export default function UnusualActivityAlertEmail({
  name,
  category,
  amount,
  averageAmount,
  multiplier,
  dashboardUrl,
}: UnusualActivityAlertEmailProps) {
  return (
    <EmailLayout preview={`Unusual activity: ${category}`}>
      <Preview>Unusual activity: {category}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Alert
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Unusual spending detected
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, we noticed an unusual expense in <span style={{ fontWeight: 500, color: "#18181B" }}>{category}</span> that&apos;s <span style={{ fontWeight: 600, color: "#18181B", fontFamily: "'JetBrains Mono', monospace" }}>{multiplier}x higher</span> than your average.
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>This expense</Text>
                  <Text style={{ fontSize: "24px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{amount}</Text>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your average</Text>
                  <Text style={{ fontSize: "14px", color: "#71717A", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{averageAmount}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        This might be expected (annual payment, one-time purchase) or it could be worth reviewing.
      </Text>

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
        Review Transaction
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        We alert you when spending is 2x or more above your category average.
      </Text>
    </EmailLayout>
  )
}

UnusualActivityAlertEmail.PreviewProps = {
  name: "Alex",
  category: "Office Supplies",
  amount: "€890",
  averageAmount: "€120",
  multiplier: "7",
  dashboardUrl: "https://polso.app/expenses",
} satisfies UnusualActivityAlertEmailProps
