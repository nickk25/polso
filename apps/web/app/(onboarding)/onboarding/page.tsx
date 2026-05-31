import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>
}) {
  const { user } = await neonAuth()
  if (!user) redirect("/auth/sign-in")

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  })

  if (!userOrg) redirect("/auth/sign-in")

  const { organization } = userOrg

  // Already onboarded — send to dashboard
  if (organization.onboardingCompletedAt) {
    redirect("/dashboard")
  }

  const { connected } = await searchParams
  const bankConnected = connected === "true"

  return (
    <OnboardingFlow
      orgName={organization.name}
      currency={organization.currency}
      telegramConnected={!!organization.telegramChatId}
      bankConnected={bankConnected}
    />
  )
}
