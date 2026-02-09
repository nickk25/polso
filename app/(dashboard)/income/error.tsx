"use client"

import { useTranslations } from "next-intl"
import { ErrorBoundary } from "@/components/error-boundary"

export default function IncomeError({
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
      title={t("errors.incomeError")}
      message={t("errors.incomeErrorMessage")}
    />
  )
}
