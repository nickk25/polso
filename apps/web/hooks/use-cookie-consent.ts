"use client"

import { useEffect, useState } from "react"

type ConsentState = "accepted" | "rejected" | null

const STORAGE_KEY = "polso-cookie-consent"
const CONSENT_EVENT = "polso-cookie-consent-change"

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState
    setConsent(stored)
    setResolved(true)

    function onExternalChange() {
      setConsent(localStorage.getItem(STORAGE_KEY) as ConsentState)
    }
    window.addEventListener(CONSENT_EVENT, onExternalChange)
    return () => window.removeEventListener(CONSENT_EVENT, onExternalChange)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted")
    setConsent("accepted")
    window.dispatchEvent(new Event(CONSENT_EVENT))
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected")
    setConsent("rejected")
    window.dispatchEvent(new Event(CONSENT_EVENT))
  }

  return {
    consent,
    resolved,
    accepted: consent === "accepted",
    pending: resolved && consent === null,
    accept,
    reject,
  }
}
