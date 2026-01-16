"use client"

import { ErrorBoundary } from "@/components/error-boundary"

export default function DashboardError({
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
      title="Dashboard Error"
      message="Failed to load the dashboard. This might be a temporary issue with our servers or your connection."
    />
  )
}
