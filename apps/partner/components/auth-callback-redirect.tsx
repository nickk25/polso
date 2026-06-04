"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

export function AuthCallbackRedirect() {
  const router = useRouter()

  useEffect(() => {
    const callbackUrl = sessionStorage.getItem(AUTH_CALLBACK_KEY)
    sessionStorage.removeItem(AUTH_CALLBACK_KEY)
    if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      router.replace(callbackUrl)
    }
  }, [router])

  return null
}
