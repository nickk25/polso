"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function ExpensesError({
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
      title="Failed to load expenses"
      message="We couldn't load your expense data. This might be a database connection issue. Please try again."
    />
  )
}
