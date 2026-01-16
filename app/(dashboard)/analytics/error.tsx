"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function AnalyticsError({
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
      title="Failed to load analytics"
      message="We couldn't calculate your analytics. This might be due to insufficient data or a temporary issue."
    />
  )
}
