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
    // Add contact to waitlist segment
    if (WAITLIST_SEGMENT_ID) {
      await resend.contacts.segments.add({
        email: normalizedEmail,
        segmentId: WAITLIST_SEGMENT_ID,
      })
    }

    // Send founder welcome email
    await sendWaitlistFounder(normalizedEmail, "there")

    return { success: true }
  } catch (error) {
    // If contact already exists, still return success
    if (error instanceof Error && error.message.includes("already exists")) {
      return { success: true }
    }

    console.error("Waitlist signup error:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
