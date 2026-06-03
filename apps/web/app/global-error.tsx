"use client"

import { NextIntlClientProvider, useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import enCommon from "@/messages/en/common.json"
import esCommon from "@/messages/es/common.json"

function GlobalErrorContent({ reset }: { reset: () => void }) {
  const t = useTranslations("common")
  return (
    <div className="max-w-md w-full p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">{t("errors.applicationError")}</h1>
      <p className="text-muted-foreground mb-6">{t("errors.refreshPage")}</p>
      <Button onClick={reset}>{t("errors.tryAgain")}</Button>
    </div>
  )
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale =
    (typeof document !== "undefined" && document.documentElement.lang) || "en"
  const messages = { common: locale === "es" ? esCommon : enCommon }

  return (
    <html lang={locale}>
      <body className="flex items-center justify-center min-h-screen bg-background">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalErrorContent reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
