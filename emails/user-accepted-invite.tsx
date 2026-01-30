import { Preview, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface UserAcceptedInviteEmailProps {
  name: string
  newMemberName: string
  newMemberEmail: string
  organizationName: string
  teamUrl: string
}

export default function UserAcceptedInviteEmail({
  name,
  newMemberName,
  newMemberEmail,
  organizationName,
  teamUrl,
}: UserAcceptedInviteEmailProps) {
  return (
    <EmailLayout preview={`${newMemberName} joined ${organizationName}`}>
      <Preview>
        {newMemberName} joined {organizationName}
      </Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Team
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        New team member
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Hi {name}, <span style={{ fontWeight: 500, color: "#18181B" }}>{newMemberName}</span> ({newMemberEmail}) has accepted your invitation and joined <span style={{ fontWeight: 500, color: "#18181B" }}>{organizationName}</span>.
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", marginBottom: "24px", backgroundColor: "#fafafa" }}>
        <tr>
          <td style={{ padding: "16px" }}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ paddingBottom: "8px" }}>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</Text>
                  <Text style={{ fontSize: "14px", fontWeight: 500, color: "#18181B", margin: 0 }}>{newMemberName}</Text>
                </td>
              </tr>
              <tr>
                <td>
                  <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</Text>
                  <Text style={{ fontSize: "14px", color: "#18181B", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{newMemberEmail}</Text>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        They now have access to your financial dashboard and reports.
      </Text>

      <Button
        href={teamUrl}
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
        Manage Team
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        Adjust team member permissions in Settings → Organization.
      </Text>
    </EmailLayout>
  )
}

UserAcceptedInviteEmail.PreviewProps = {
  name: "Alex",
  newMemberName: "Jordan",
  newMemberEmail: "jordan@acme.com",
  organizationName: "Acme Inc",
  teamUrl: "https://polso.app/settings/organization",
} satisfies UserAcceptedInviteEmailProps
