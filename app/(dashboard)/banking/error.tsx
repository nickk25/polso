"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function BankingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Failed to load banking"
      message="We couldn't load your bank accounts. This might be a connection issue with your bank or our servers."
    />
  )
}
