import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface TrialEndingEmailProps {
  name: string
  daysLeft: number
  trialEndDate: string
  upgradeUrl: string
}

export default function TrialEndingEmail({
  name,
  daysLeft,
  trialEndDate,
  upgradeUrl,
}: TrialEndingEmailProps) {
  return (
    <EmailLayout preview={`Your trial ends in ${daysLeft} days`}>
      <Preview>{`Your trial ends in ${daysLeft} days`}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Trial ending
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {daysLeft} days left on your trial
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Hi {name}, your Polso trial ends on <span style={{ fontWeight: 500, color: "#18181B" }}>{trialEndDate}</span>. After that, you&apos;ll lose access to your dashboard and analytics.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        To keep your financial clarity:
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "12px", borderBottom: "1px solid #e4e4e7" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Starter</Text>
                  <Text style={{ fontSize: "16px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>€23<span style={{ fontWeight: 400, color: "#71717A", fontSize: "12px" }}>/mo</span></Text>
                  <Text style={{ fontSize: "12px", color: "#71717A", margin: "4px 0 0 0" }}>3 bank connections, 2 users</Text>
                </td>
              </tr>
              <tr>
                <td style={{ paddingTop: "12px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Business</Text>
                  <Text style={{ fontSize: "16px", fontWeight: 600, color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>€42<span style={{ fontWeight: 400, color: "#71717A", fontSize: "12px" }}>/mo</span></Text>
                  <Text style={{ fontSize: "12px", color: "#71717A", margin: "4px 0 0 0" }}>8 bank connections, 5 users, priority support</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Button
        href={upgradeUrl}
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
        Upgrade Now
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Questions about pricing? Just reply to this email.
      </Text>
    </EmailLayout>
  )
}

TrialEndingEmail.PreviewProps = {
  name: "Alex",
  daysLeft: 3,
  trialEndDate: "February 14, 2026",
  upgradeUrl: "https://polso.app/settings/billing",
} satisfies TrialEndingEmailProps
