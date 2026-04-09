import { Check } from "@phosphor-icons/react/dist/ssr"
import { getTranslations } from "next-intl/server"

export async function PricingSection() {
  const t = await getTranslations("marketing")

  const plans = [
    {
      name: t("pricing.starter"),
      price: "23",
      period: t("pricing.perMonth"),
      description: t("pricing.starterDesc"),
      features: [
        t("pricing.starterFeature1"),
        t("pricing.starterFeature2"),
        t("pricing.starterFeature3"),
        t("pricing.starterFeature4"),
      ],
      cta: t("pricing.startFreeTrial"),
      highlighted: false,
    },
    {
      name: t("pricing.business"),
      price: "42",
      period: t("pricing.perMonth"),
      description: t("pricing.businessDesc"),
      features: [
        t("pricing.businessFeature1"),
        t("pricing.businessFeature2"),
        t("pricing.businessFeature3"),
        t("pricing.businessFeature4"),
      ],
      cta: t("pricing.startFreeTrial"),
      highlighted: true,
    },
  ]

  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("pricing.label")}
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col border p-8 ${
                plan.highlighted
                  ? "border-primary bg-primary/5"
                  : "bg-card"
              }`}
            >
              <div>
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-6 flex items-baseline">
                <span className="text-lg font-medium text-muted-foreground">€</span>
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <Check className="h-4 w-4 text-primary" weight="bold" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                {t("pricing.comingSoon")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
