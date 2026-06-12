import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { needsConsent } from "@/features/auth/queries/get-consent-status"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await neonAuth()

  if (!user) {
    redirect("/auth/sign-in")
  }

  if (await needsConsent(user.id)) {
    redirect("/onboarding/consent")
  }

  return <>{children}</>
}
