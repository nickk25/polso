"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function DashboardPageError({
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
      title="Dashboard unavailable"
      message="We couldn't load your dashboard data. Please check your connection and try again."
    />
  )
}
