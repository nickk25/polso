"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AuthView } from "@neondatabase/auth/react"

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const path = params.path
  const t = useTranslations("marketing")

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
