import { ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"

export async function BuiltForSection() {
  const t = await getTranslations("marketing")

  const personas = [
    { title: t("builtFor.freelancersTitle"), pain: t("builtFor.freelancersPain"), solution: t("builtFor.freelancersSolution") },
    { title: t("builtFor.soloFoundersTitle"), pain: t("builtFor.soloFoundersPain"), solution: t("builtFor.soloFoundersSolution") },
    { title: t("builtFor.smallTeamsTitle"), pain: t("builtFor.smallTeamsPain"), solution: t("builtFor.smallTeamsSolution") },
    { title: t("builtFor.sideHustlersTitle"), pain: t("builtFor.sideHustlersPain"), solution: t("builtFor.sideHustlersSolution") },
  ]

  return (
    <section className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("builtFor.label")}
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("builtFor.title")}
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          {personas.map((persona, index) => (
            <div
              key={persona.title}
              className={`grid grid-cols-1 items-center gap-4 py-8 text-center md:grid-cols-[120px_1fr_24px_1fr] md:gap-6 md:text-left ${
                index !== personas.length - 1 ? "border-b border-dashed" : ""
              }`}
            >
              <span className="text-sm font-semibold text-primary">
                {persona.title}
              </span>
              <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                {persona.pain}
              </span>
              <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground/40 md:block" />
              <span className="text-sm font-medium">{persona.solution}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
