import { Preview, Text } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"

interface WaitlistFounderEmailProps {
  name: string
}

export default function WaitlistFounderEmail({
  name,
}: WaitlistFounderEmailProps) {
  return (
    <EmailLayout preview="A personal note from Nicolas">
      <Preview>A personal note from Nicolas</Preview>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Hey {name},
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Thanks for joining the Polso waiting list. I&apos;m Nick, the founder, and I wanted to let you know — you&apos;re in.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        I&apos;m building Polso for freelancers and small teams who want to know their numbers without waiting for the monthly report. Bank sync, automatic categorization, runway in real time.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        I&apos;m opening access in small batches to make sure everything works smoothly. You&apos;ll hear from me as soon as your spot is ready.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 24px 0", lineHeight: 1.6 }}>
        In the meantime, if you have questions or want to share what you&apos;re hoping Polso solves for you — just reply. I read every message.
      </Text>

      <Text style={{ fontSize: "14px", color: "#3f3f46", margin: "0 0 4px 0", lineHeight: 1.6 }}>
        Talk soon,
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

WaitlistFounderEmail.PreviewProps = {
  name: "Alex",
} satisfies WaitlistFounderEmailProps
