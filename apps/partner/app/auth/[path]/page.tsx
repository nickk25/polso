"use client"

import { useParams } from "next/navigation"
import { AuthView } from "@neondatabase/auth/react"

export default function AuthPage() {
  const params = useParams<{ path: string }>()

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
