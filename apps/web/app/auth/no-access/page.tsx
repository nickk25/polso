"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { authClient } from "@polso/auth/client"
import { Button } from "@polso/ui/button"

export default function NoAccessPage() {
  const t = useTranslations("auth")
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/auth/sign-in")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("noAccess.heading")}</h1>
          <p className="text-sm text-muted-foreground">{t("noAccess.description")}</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          {t("noAccess.signOut")}
        </Button>
      </div>
    </div>
  )
}
