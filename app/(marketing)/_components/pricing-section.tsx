import { Check } from "@phosphor-icons/react/dist/ssr"

const plans = [
  {
    name: "Starter",
    price: "23",
    period: "/mo",
    description: "For freelancers and solo founders",
    features: [
      "3 bank connections",
      "2 users",
      "All features included",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Business",
    price: "42",
    period: "/mo",
    description: "For growing teams",
    features: [
      "8 bank connections",
      "5 users",
      "All features included",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Pricing
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Simple pricing by organization
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            No per-seat fees. 14-day free trial. Cancel anytime.
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
                Coming soon
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
