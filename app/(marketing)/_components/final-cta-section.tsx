import { Shield, LockKey, Flag } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"
import { WaitlistForm } from "./waitlist-form"

export async function FinalCtaSection() {
  const t = await getTranslations("marketing")

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("finalCta.title")}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            {t("finalCta.subtitle")}
          </p>

          {/* Waitlist form */}
          <div className="mt-8">
            <WaitlistForm source="footer" />
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" weight="duotone" />
              {t("finalCta.trustReadOnly")}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-1.5">
              <LockKey className="h-3.5 w-3.5" weight="duotone" />
              {t("finalCta.trustNoCredentials")}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" weight="duotone" />
              {t("finalCta.trustGdpr")}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
