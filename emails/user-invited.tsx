import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface UserInvitedEmailProps {
  inviterName: string
  organizationName: string
  inviteUrl: string
}

export default function UserInvitedEmail({
  inviterName,
  organizationName,
  inviteUrl,
}: UserInvitedEmailProps) {
  return (
    <EmailLayout preview={`${inviterName} invited you to ${organizationName}`}>
      <Preview>
        {inviterName} invited you to {organizationName}
      </Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Invitation
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        You&apos;ve been invited
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        <span style={{ fontWeight: 500, color: "#18181B" }}>{inviterName}</span> has invited you to join <span style={{ fontWeight: 500, color: "#18181B" }}>{organizationName}</span> on Polso.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Polso helps teams track expenses, monitor cash flow, and stay on top of their finances.
      </Text>

      <Button
        href={inviteUrl}
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
        Accept Invitation
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        This invitation expires in 7 days.
      </Text>
    </EmailLayout>
  )
}

UserInvitedEmail.PreviewProps = {
  inviterName: "Alex",
  organizationName: "Acme Inc",
  inviteUrl: "https://polso.app/invite/abc123",
} satisfies UserInvitedEmailProps
