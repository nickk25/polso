import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface WelcomeFounderEmailProps {
  name: string
}

export default function WelcomeFounderEmail({
  name,
}: WelcomeFounderEmailProps) {
  return (
    <EmailLayout preview="A personal note from Nicolas">
      <Preview>A personal note from Nicolas</Preview>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Hey {name},
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Thanks for signing up for Polso. I&apos;m Nick, the founder, and I wanted to personally welcome you.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        I built Polso because I was tired of not knowing my numbers until my accountant told me — weeks later. By then, the decisions were already made.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        You shouldn&apos;t have to wait until the end of the month to understand your finances. Connect your bank, see your expenses categorized, know how long your cash will last. That&apos;s it.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        I read every reply to this email. If something&apos;s confusing, something&apos;s missing, or you just want to share how you&apos;re using it — hit reply. I&apos;d love to hear from you.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 4px 0", lineHeight: 1.6 }}>
        Welcome aboard,
      </Text>

      <Text style={{ fontSize: "14px", color: "#18181B", margin: "0 0 0 0", lineHeight: 1.6, fontWeight: 500 }}>
        Nick
      </Text>
      <Text style={{ fontSize: "13px", color: "#71717A", margin: "0" }}>
        Founder, Polso
      </Text>
    </EmailLayout>
  )
}

WelcomeFounderEmail.PreviewProps = {
  name: "Alex",
} satisfies WelcomeFounderEmailProps
