"use client"

import { NeonAuthUIProvider } from "@neondatabase/auth/react"
import { authClient } from "@polso/auth/client"
import { esLocalization } from "@/lib/auth-localization-es"

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/dashboard"
      credentials={false}
      emailOTP
      localization={esLocalization}
    >
      {children}
    </NeonAuthUIProvider>
  )
}
