"use client"

import { useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { AuthView } from "@neondatabase/auth/react"

const AUTH_CALLBACK_KEY = "authCallbackUrl"

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const searchParams = useSearchParams()

  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl")
    if (callbackUrl) {
      sessionStorage.setItem(AUTH_CALLBACK_KEY, callbackUrl)
    }
  }, [searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Polso Partner</h1>
        <p className="text-muted-foreground text-sm">Panel de asesoría</p>
      </div>
      <AuthView path={params.path} />
    </main>
  )
}
