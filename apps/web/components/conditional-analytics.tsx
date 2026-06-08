"use client"

import { Analytics } from "@vercel/analytics/react"
import { useCookieConsent } from "@/hooks/use-cookie-consent"

export function ConditionalAnalytics() {
  const { accepted } = useCookieConsent()
  if (!accepted) return null
  return <Analytics />
}
