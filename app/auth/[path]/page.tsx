"use client"

import { useParams } from "next/navigation"
import { AuthView } from "@neondatabase/auth/react"

export default function AuthPage() {
  const params = useParams<{ path: string }>()
  const path = params.path

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Polso</h1>
        <p className="text-muted-foreground">Financial Management Platform</p>
      </div>
      <AuthView path={path} />
    </main>
  )
}
