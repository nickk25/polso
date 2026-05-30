import { neonAuthMiddleware } from "@neondatabase/auth/next/server"
import { NextResponse, type NextRequest } from "next/server"
import { locales, defaultLocale, localeMap, type Locale } from "@/lib/i18n/config"

const LOCALE_COOKIE = "NEXT_LOCALE"

const protectedPaths = [
  "/dashboard",
  "/transactions",
  "/expenses",
  "/incomes",
  "/analytics",
  "/recurring",
  "/categories",
  "/vendors",
  "/clients",
  "/export",
  "/settings",
  "/account",
]

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )
}

function detectLocaleFromHeaders(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language")
  if (!acceptLanguage) return defaultLocale

  const segments = acceptLanguage.split(",")
  for (const segment of segments) {
    const [lang] = segment.trim().split(";")
    const trimmed = lang.trim()

    if (localeMap[trimmed]) {
      return localeMap[trimmed]
    }

    const base = trimmed.split("-")[0]
    if (locales.includes(base as Locale)) {
      return base as Locale
    }
  }

  return defaultLocale
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes - use Neon Auth
  if (isProtectedPath(pathname)) {
    return neonAuthMiddleware({ loginUrl: "/auth/sign-in" })(request)
  }

  // Public routes - set locale cookie if missing
  const response = NextResponse.next()
  if (!request.cookies.has(LOCALE_COOKIE)) {
    const locale = detectLocaleFromHeaders(request)
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    })
  }
  return response
}

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/expenses/:path*",
    "/incomes/:path*",
    "/analytics/:path*",
    "/recurring/:path*",
    "/categories/:path*",
    "/vendors/:path*",
    "/clients/:path*",
    "/export/:path*",
    "/settings/:path*",
    "/account/:path*",
    // Public routes for locale detection
    "/",
    "/auth/:path*",
    "/invite/:path*",
    "/pricing/:path*",
    "/about/:path*",
  ],
}
