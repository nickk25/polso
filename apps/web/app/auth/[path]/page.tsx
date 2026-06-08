"use client"

import { useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { EmailOtpForm } from "@polso/auth/ui"
import { recordConsentAction } from "@/features/auth/actions/record-consent"

const AUTH_CALLBACK_KEY = "authCallbackUrl"
const SIGN_IN_PATHS = new Set(["sign-in", "magic-link"])

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = params.path
  const t = useTranslations("auth")

  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl")
    if (callbackUrl) {
      sessionStorage.setItem(AUTH_CALLBACK_KEY, callbackUrl)
    }
  }, [searchParams])

  useEffect(() => {
    if (!SIGN_IN_PATHS.has(path)) {
      router.replace("/auth/sign-in")
    }
  }, [path, router])

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

          {SIGN_IN_PATHS.has(path) && (
            <EmailOtpForm
              badge={t("form.badge")}
              heading={t("form.heading")}
              subheading={t("form.subheading")}
              showConsent
              onVerifySuccess={recordConsentAction}
              translations={{
                emailPlaceholder: t("form.emailPlaceholder"),
                emailRequired: t("form.emailRequired"),
                emailInvalid: t("form.emailInvalid"),
                sendError: t("form.sendError"),
                sending: t("form.sending"),
                continueLabel: t("form.continue"),
                codeSentPrefix: t("form.codeSentPrefix"),
                codeResent: t("form.codeResent"),
                resendPrompt: t("form.resendPrompt"),
                resendLabel: t("form.resendLabel"),
                otpError: t("form.otpError"),
                consentLabel: t("form.consentLabel"),
                consentRequired: t("form.consentRequired"),
                consentTerms: t("form.consentTerms"),
                consentPrivacy: t("form.consentPrivacy"),
              }}
            />
          )}

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
