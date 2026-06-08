"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { useCookieConsent } from "@/hooks/use-cookie-consent"

export function CookieConsent() {
  const t = useTranslations("common.cookies")
  const { pending, accept, reject } = useCookieConsent()

  if (!pending) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("description")}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("learnMore")}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={reject}>
            {t("reject")}
          </Button>
          <Button size="sm" onClick={accept}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  )
}
