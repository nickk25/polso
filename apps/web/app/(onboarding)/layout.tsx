import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await neonAuth()

  if (!user) {
    redirect("/auth/sign-in")
  }

  return <>{children}</>
}
