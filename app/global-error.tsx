"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("common")
  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("errors.applicationError")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("errors.refreshPage")}
          </p>
          <Button onClick={reset}>{t("errors.tryAgain")}</Button>
        </div>
      </body>
    </html>
  )
}
