import { ArrowRight } from "@phosphor-icons/react/dist/ssr"

const personas = [
  {
    title: "Freelancers",
    pain: "Chasing invoices, guessing taxes",
    solution: "Track every payment. Know what you owe.",
  },
  {
    title: "Solo founders",
    pain: "Spreadsheets updated once a month",
    solution: "Runway updates daily. Decide with real numbers.",
  },
  {
    title: "Small teams",
    pain: "Accountant sees last month's data",
    solution: "Export everything in one click.",
  },
  {
    title: "Side hustlers",
    pain: "Mixed personal and business spending",
    solution: "Finally see the real picture.",
  },
]

export function BuiltForSection() {
  return (
    <section className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Built for
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            If this sounds familiar, Polso is for you
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
