import { Button } from "@/components/ui/button"
import { DashboardMockup } from "./mockups/dashboard-mockup"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 border bg-muted/50 px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Launching soon — Join the waitlist
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Know your numbers without waiting for your accountant
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Connect your bank. See expenses categorized. Track your runway — updated daily, not monthly.
          </p>

          {/* Waitlist form */}
          <form className="mx-auto mt-8 flex max-w-sm flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="you@company.com"
              className="h-10 flex-1 border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <Button type="submit" className="h-10">
              Join waitlist
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Be the first to know when we launch.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
