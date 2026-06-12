import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { getTranslations } from "next-intl/server"
import { needsConsent } from "@/features/auth/queries/get-consent-status"
import { ConsentStep } from "@/features/onboarding/components/steps/consent-step"

export default async function ConsentPage() {
  const { user } = await neonAuth()
  if (!user) redirect("/auth/sign-in")

  if (!(await needsConsent(user.id))) redirect("/onboarding")

  const t = await getTranslations("auth")

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <ConsentStep
          heading={t("consent.heading")}
          subheading={t("consent.subheading")}
          label={t("consent.label")}
          terms={t("consent.terms")}
          privacy={t("consent.privacy")}
          required={t("consent.required")}
          accept={t("consent.accept")}
        />
      </div>
    </div>
  )
}
