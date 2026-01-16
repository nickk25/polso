"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function IncomeError({
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
      title="Failed to load income"
      message="We couldn't load your income data. This might be a database connection issue. Please try again."
    />
  )
}
