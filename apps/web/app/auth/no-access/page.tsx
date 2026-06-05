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
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="bg-white p-10">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-zinc-900 size-7 flex items-center justify-center shrink-0">
              <span className="text-[#FAFAFA] text-sm font-bold font-mono leading-none">P</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">Polso</span>
          </div>

          <hr className="border-zinc-200 mb-8" />

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                {t("noAccess.badge")}
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                {t("noAccess.heading")}
              </h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {t("noAccess.description")}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              {t("noAccess.signOut")}
            </Button>
          </div>

          <hr className="border-zinc-200 mt-10 mb-6" />

          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">
              {t("footer.privacy")}
            </a>
            <span className="text-zinc-300 text-xs">·</span>
            <a href="/terms" className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">
              {t("footer.terms")}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
