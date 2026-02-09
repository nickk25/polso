import { getTranslations } from "next-intl/server"

export async function ProblemSection() {
  const t = await getTranslations("marketing")

  return (
    <section className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("problem.label")}
          </p>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground">
            <p>
              {t("problem.p1")}
            </p>
            <p>
              {t("problem.p2")} <span className="text-foreground font-medium">{t("problem.p2Highlight")}</span>.
            </p>
            <p>
              {t("problem.p3")}
            </p>
            <p>
              {t("problem.p4")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
