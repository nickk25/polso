"use client"

import { NeonAuthUIProvider } from "@neondatabase/auth/react"
import { authClient } from "@polso/auth/client"

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/dashboard"
      emailOTP
    >
      {children}
    </NeonAuthUIProvider>
  )
}
