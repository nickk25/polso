"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"

export async function completeOnboardingAction(): Promise<void> {
  const { organizationId } = await getAuthContext()

  await prisma.organization.update({
    where: { id: organizationId },
    data: { onboardingCompletedAt: new Date() },
  })

  redirect("/dashboard")
}
