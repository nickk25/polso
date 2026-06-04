"use client"

import { useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CheckCircle } from "@phosphor-icons/react"
import { EmailOtpForm } from "@polso/auth/ui"

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

  const features = t.raw("panel.features") as string[]

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="text-xl font-semibold tracking-tight">{t("panel.logo")}</div>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-tight whitespace-pre-line">
              {t("panel.heading")}
            </h2>
            <p className="text-primary-foreground/70">
              {t("panel.description")}
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <CheckCircle weight="fill" className="h-4 w-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/40">
          {t("panel.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-xl font-semibold tracking-tight lg:hidden">{t("panel.logo")}</div>
          {SIGN_IN_PATHS.has(path) && (
            <EmailOtpForm
              heading={t("form.heading")}
              subheading={t("form.subheading")}
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
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
