"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

/**
 * Client component that checks for a pending auth callback URL in sessionStorage.
 * When found (e.g., after sign-in from the invite page), it redirects the user
 * back to the original page instead of staying on the dashboard.
 *
 * Placed in the dashboard layout so it runs immediately after post-auth redirect.
 */
export function AuthCallbackRedirect() {
  const router = useRouter()

  useEffect(() => {
    const callbackUrl = sessionStorage.getItem(AUTH_CALLBACK_KEY)
    if (callbackUrl) {
      sessionStorage.removeItem(AUTH_CALLBACK_KEY)
      router.replace(callbackUrl)
    }
  }, [router])

  return null
}
