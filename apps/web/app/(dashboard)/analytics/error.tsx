"use client"

import { useTranslations } from "next-intl"
import { ErrorBoundary } from "@/components/error-boundary"

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("common")
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title={t("errors.analyticsError")}
      message={t("errors.analyticsErrorMessage")}
    />
  )
}
