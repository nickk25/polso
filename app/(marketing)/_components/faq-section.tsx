"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is my bank data secure?",
    answer:
      "Yes. We use Plaid for bank connections. We never see or store your bank credentials. All data is encrypted.",
  },
  {
    question: "Which banks are supported?",
    answer:
      "Over 12,000 institutions via Open Banking. Most major banks in Europe and US are supported.",
  },
  {
    question: "How does categorization work?",
    answer:
      "Polso uses a 4-level system: vendor defaults, Plaid categories, keyword matching, and fallback rules. Every transaction shows why it was categorized with a confidence score.",
  },
  {
    question: "Can my accountant access Polso?",
    answer:
      "Yes. You can invite your accountant as a user, or simply export everything they need as a ZIP file each month.",
  },
  {
    question: "What happens after the trial?",
    answer:
      "After 14 days, choose a plan or lose access. Your data stays for 30 days in case you decide to subscribe later.",
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="border-t bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            FAQ
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
