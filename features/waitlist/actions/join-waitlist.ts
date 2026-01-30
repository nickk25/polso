"use server"

import { resend } from "@/lib/email/resend"
import { sendWaitlistFounder } from "@/lib/email/send"

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
    // Add contact to waitlist segment (optional - skip if not configured)
    if (WAITLIST_SEGMENT_ID) {
      const { error: segmentError } = await resend.contacts.segments.add({
        email: normalizedEmail,
        segmentId: WAITLIST_SEGMENT_ID,
      })

      if (segmentError && !segmentError.message?.includes("already exists")) {
        console.error("Segment add error:", segmentError)
      }
    }

    // Send founder welcome email
    const { error: emailError } = await sendWaitlistFounder(normalizedEmail, "there")

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
