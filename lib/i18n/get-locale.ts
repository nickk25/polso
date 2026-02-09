import { cookies, headers } from "next/headers"
import { locales, defaultLocale, localeMap, type Locale } from "./config"

const LOCALE_COOKIE = "NEXT_LOCALE"

function parseAcceptLanguage(header: string): Locale | null {
  const segments = header.split(",")

  for (const segment of segments) {
    const [lang] = segment.trim().split(";")
    const trimmed = lang.trim()

    // Try exact match first (e.g. "es-ES")
    if (localeMap[trimmed]) {
      return localeMap[trimmed]
    }

    // Try base language (e.g. "es" from "es-AR")
    const base = trimmed.split("-")[0]
    if (locales.includes(base as Locale)) {
      return base as Locale
    }
  }

  return null
}

export async function getLocale(): Promise<Locale> {
  // 1. Check cookie
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale
  }

  // 2. Parse Accept-Language header
  const headerStore = await headers()
  const acceptLanguage = headerStore.get("accept-language")
  if (acceptLanguage) {
    const detected = parseAcceptLanguage(acceptLanguage)
    if (detected) {
      return detected
    }
  }

  // 3. Default
  return defaultLocale
}
