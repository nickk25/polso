import {
  Bank,
  ArrowsClockwise,
  ChartLineUp,
  ArrowRight,
  Shield,
  LockKey,
  Flag,
} from "@phosphor-icons/react/dist/ssr"

const steps = [
  {
    number: "1",
    title: "Connect your bank",
    description: "Secure Open Banking connection. 2 minutes.",
    icon: Bank,
  },
  {
    number: "2",
    title: "Sync automatically",
    description: "Transactions appear daily. Auto-categorized.",
    icon: ArrowsClockwise,
  },
  {
    number: "3",
    title: "See real-time numbers",
    description: "Runway, burn rate, cash flow — always current.",
    icon: ChartLineUp,
  },
]

export function HowItWorksSection() {
  return (
    <section className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Get started in minutes
          </h2>
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-0">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              {/* Step card */}
              <div className="group w-64 border bg-background p-6 text-center transition-all hover:border-primary/50 hover:shadow-lg">
                {/* Number + Icon */}
                <div className="mb-4 flex flex-col items-center gap-6">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Step {step.number}
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" weight="duotone" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="hidden px-6 md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" weight="duotone" />
            <span className="text-sm text-muted-foreground">Read-only access</span>
          </div>
          <div className="flex items-center gap-2">
            <LockKey className="h-4 w-4 text-muted-foreground" weight="duotone" />
            <span className="text-sm text-muted-foreground">We never see your password</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-muted-foreground" weight="duotone" />
            <span className="text-sm text-muted-foreground">GDPR compliant</span>
          </div>
        </div>
      </div>
    </section>
  )
}
