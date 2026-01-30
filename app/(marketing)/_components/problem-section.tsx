export function ProblemSection() {
  return (
    <section className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            The problem
          </p>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground">
            <p>
              Your accountant tells you how you did last month.
            </p>
            <p>
              But you need to know how you&apos;re doing <span className="text-foreground font-medium">right now</span>.
            </p>
            <p>
              How much runway do you have? Are subscriptions eating your cash? Is that client payment late?
            </p>
            <p>
              By the time the report arrives, the decisions are already made.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
