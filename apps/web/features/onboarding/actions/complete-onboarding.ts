"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { sendWelcome, sendWelcomeFounder } from "@polso/email/send"

export async function completeOnboardingAction(): Promise<void> {
  const { userId, organizationId } = await getAuthContext()

  await prisma.organization.update({
    where: { id: organizationId },
    data: { onboardingCompletedAt: new Date() },
  })

  void (async () => {
    try {
      const member = await prisma.userOrganization.findFirst({
        where: { userId, organizationId },
        select: { memberEmail: true, memberName: true },
      })
      const email = member?.memberEmail
      const name = member?.memberName ?? email?.split("@")[0] ?? ""
      if (email) {
        await Promise.all([
          sendWelcome(email, name),
          sendWelcomeFounder(email, name),
        ])
      }
    } catch (err) {
      console.error("[completeOnboarding] welcome email failed:", err)
    }
  })()

  redirect("/dashboard")
}
