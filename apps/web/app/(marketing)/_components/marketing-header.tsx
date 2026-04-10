import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@polso/ui/button"

export async function MarketingHeader() {
  const t = await getTranslations("marketing")

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
            P
          </div>
          <span className="text-sm font-semibold">Polso</span>
        </Link>

        {/* Centered Nav */}
        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          <a
            href="#features"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("header.features")}
          </a>
          <a
            href="#pricing"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("header.pricing")}
          </a>
          <a
            href="#faq"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("header.faq")}
          </a>
        </nav>

        {/* Badge - until launch */}
        <div className="ml-auto flex items-center gap-2 border bg-muted/50 px-2.5 py-1 text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {t("header.comingSoon")}
        </div>

        {/* Right Actions - Hidden until launch */}
        <div className="ml-auto hidden items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t("header.signIn")}
          </Link>
          <Button size="sm" asChild>
            <Link href="/auth/sign-up">{t("header.startFreeTrial")}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
