"use server"

import { resend } from "@/lib/email/resend"
import { sendWaitlistFounder } from "@/lib/email/send"
import { getLocale } from "@/lib/i18n/get-locale"

const WAITLIST_SEGMENT_ID = process.env.RESEND_WAITLIST_SEGMENT_ID

interface JoinWaitlistResult {
  success: boolean
  error?: string
}

export async function joinWaitlist(
  formData: FormData
): Promise<JoinWaitlistResult> {
  const email = formData.get("email") as string

  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address" }
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Add contact to waitlist segment
    if (WAITLIST_SEGMENT_ID) {
      const { error: contactError } = await resend.contacts.create({
        email: normalizedEmail,
        unsubscribed: false,
        segments: [{ id: WAITLIST_SEGMENT_ID }],
      })

      // Ignore "already exists" errors
      if (contactError && !contactError.message?.includes("already exists")) {
        console.error("Contact create error:", contactError)
      }
    }

    // Send founder welcome email
    const locale = await getLocale()
    const { error: emailError } = await sendWaitlistFounder(normalizedEmail, "there", locale)

    if (emailError) {
      console.error("Email send error:", emailError)
      return { success: false, error: "Failed to send email. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Waitlist signup error:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
