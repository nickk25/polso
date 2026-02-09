import { getTranslations } from "next-intl/server"

export async function SolutionSection() {
  const t = await getTranslations("marketing")
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("solution.label")}
          </p>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">{t("solution.p1")}</span>
            </p>
            <p>
              {t("solution.p2")}
            </p>
            <p>
              {t("solution.p3")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
