"use client"

import dynamic from "next/dynamic"

// ssr: false prevents Radix UI aria-controls ID mismatch during hydration
const OnboardingFlow = dynamic(
  () => import("./onboarding-flow").then((m) => m.OnboardingFlow),
  { ssr: false }
)

export { OnboardingFlow }
