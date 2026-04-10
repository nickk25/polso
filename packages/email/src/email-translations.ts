import type { Locale } from "./locale"
import { defaultLocale } from "./locale"

import en from "../messages/en/emails.json"
import es from "../messages/es/emails.json"

const messages: Record<Locale, Record<string, unknown>> = { en, es }

export function getEmailTranslations(locale: Locale = defaultLocale) {
  const m = messages[locale] ?? messages[defaultLocale]

  return function t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    const raw = key
      .split(".")
      .reduce<unknown>(
        (obj, k) =>
          obj && typeof obj === "object" ? (obj as Record<string, unknown>)[k] : undefined,
        m
      )

    if (typeof raw !== "string") return key

    let result = raw
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replaceAll(`{${k}}`, String(v))
      }
    }

    return result
  }
}
