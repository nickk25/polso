import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface TrialEndedEmailProps {
  name: string
  upgradeUrl: string
}

export default function TrialEndedEmail({
  name,
  upgradeUrl,
}: TrialEndedEmailProps) {
  return (
    <EmailLayout preview="Your Polso trial has ended">
      <Preview>Your Polso trial has ended</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Trial ended
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        Your trial has ended
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Hi {name}, your 14-day Polso trial has ended. Your data is safe, but you no longer have access to your dashboard.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Ready to keep your financial clarity?
      </Text>

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
        Your data will be kept for 30 days. After that, it will be permanently deleted.
      </Text>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "12px 0 0 0" }}>
        Changed your mind? Just reply to this email.
      </Text>
    </EmailLayout>
  )
}

TrialEndedEmail.PreviewProps = {
  name: "Alex",
  upgradeUrl: "https://polso.app/settings/billing",
} satisfies TrialEndedEmailProps
