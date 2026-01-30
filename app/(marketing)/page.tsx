import { Metadata } from "next"
import { HeroSection } from "./_components/hero-section"
import { ProblemSection } from "./_components/problem-section"
import { SolutionSection } from "./_components/solution-section"
import { HowItWorksSection } from "./_components/how-it-works-section"
import { FeaturesSection } from "./_components/features-section"
import { BuiltForSection } from "./_components/built-for-section"
import { PricingSection } from "./_components/pricing-section"
import { FaqSection } from "./_components/faq-section"
import { FinalCtaSection } from "./_components/final-cta-section"

export const metadata: Metadata = {
  title: "Polso — Know Your Numbers Without Waiting for Your Accountant",
  description:
    "Connect your bank, see expenses categorized automatically, track runway in real-time. Financial clarity for founders and small businesses.",
  keywords: [
    "expense tracking",
    "runway calculator",
    "burn rate",
    "financial management",
    "small business finance",
    "expense categorization",
    "open banking",
    "business analytics",
  ],
  openGraph: {
    title: "Polso — Real-time Financial Clarity",
    description:
      "Stop guessing. Start knowing. Connect your bank and see your numbers in real-time.",
    type: "website",
  },
}

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <FeaturesSection />
      <BuiltForSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  )
}
