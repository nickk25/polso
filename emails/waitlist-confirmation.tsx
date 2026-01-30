import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface WaitlistConfirmationEmailProps {
  email: string
}

export default function WaitlistConfirmationEmail({
  email,
}: WaitlistConfirmationEmailProps) {
  return (
    <EmailLayout preview="You're on the Polso waitlist!">
      <Preview>You&apos;re on the Polso waitlist!</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Waitlist
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        You&apos;re on the list.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Thanks for joining. We&apos;re building something special for founders and small teams who want real-time financial clarity.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        We&apos;ll notify you at <span style={{ fontWeight: 500, color: "#18181B" }}>{email}</span> as soon as we launch.
      </Text>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        What you&apos;ll get
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px" }}>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Connect your bank securely via Open Banking
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Auto-categorize expenses with 95% accuracy
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "8px" }}>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Track your runway and burn rate daily
            </Text>
          </td>
        </tr>
        <tr>
          <td>
            <Text style={{ fontSize: "13px", color: "#3f3f46", margin: 0 }}>
              <span style={{ color: "#a1a1aa", marginRight: "8px" }}>—</span>
              Export everything for your accountant in one click
            </Text>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "13px", color: "#71717A", margin: 0 }}>
        See you soon.
      </Text>
    </EmailLayout>
  )
}

WaitlistConfirmationEmail.PreviewProps = {
  email: "founder@startup.com",
} satisfies WaitlistConfirmationEmailProps
