"use client"

import { useSyncExternalStore } from "react"

type ConsentState = "accepted" | "rejected" | null

const STORAGE_KEY = "polso-cookie-consent"
const CONSENT_EVENT = "polso-cookie-consent-change"

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onStoreChange)
  return () => window.removeEventListener(CONSENT_EVENT, onStoreChange)
}

function getSnapshot(): ConsentState {
  return localStorage.getItem(STORAGE_KEY) as ConsentState
}

// Server render has no localStorage — stay unresolved until hydration
function getServerSnapshot(): ConsentState {
  return null
}

function setStoredConsent(value: "accepted" | "rejected") {
  localStorage.setItem(STORAGE_KEY, value)
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function useCookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // false during SSR/hydration, true once the client snapshot is in use
  const resolved = useSyncExternalStore(subscribe, () => true, () => false)

  return {
    consent,
    resolved,
    accepted: consent === "accepted",
    pending: resolved && consent === null,
    accept: () => setStoredConsent("accepted"),
    reject: () => setStoredConsent("rejected"),
  }
}
