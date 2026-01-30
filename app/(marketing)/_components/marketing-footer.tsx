import Link from "next/link"

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                P
              </div>
              <span className="text-sm font-semibold">Polso</span>
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Real-time financial clarity
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/auth/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Polso. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
