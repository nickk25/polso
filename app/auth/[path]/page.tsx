"use client"

import { useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AuthView } from "@neondatabase/auth/react"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const searchParams = useSearchParams()
  const path = params.path
  const t = useTranslations("marketing")

  // Save callbackUrl to sessionStorage so it persists through the auth flow.
  // After sign-in, NeonAuthUIProvider redirects to /dashboard where
  // AuthCallbackRedirect picks it up and redirects back.
  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl")
    if (callbackUrl) {
      sessionStorage.setItem(AUTH_CALLBACK_KEY, callbackUrl)
    }
  }, [searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{t("auth.title")}</h1>
        <p className="text-muted-foreground">{t("auth.subtitle")}</p>
      </div>
      <AuthView path={path} />
    </main>
  )
}
