"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { updatePreferencesAction } from "../actions/update-preferences"

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const LOCALES = [
  { value: "en-US", label: "English" },
  { value: "es-ES", label: "Español" },
]

interface PreferencesFormProps {
  preferences: {
    theme: string
    locale: string
  }
}

type Values = { theme: string; locale: string }

export function PreferencesForm({ preferences }: PreferencesFormProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const t = useTranslations("settings")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  const [values, setValues] = useState<Values>({
    theme: preferences.theme,
    locale: preferences.locale,
  })

  // Sync DB-stored theme into next-themes on first render
  useEffect(() => {
    setTheme(preferences.theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (next: Values) => {
    setStatus("saving")
    const result = await updatePreferencesAction(next)
    if (result.success) router.refresh()
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 1500)
  }, [router])

  const update = useCallback((patch: Partial<Values>) => {
    const next = { ...values, ...patch }
    setValues(next)
    if (patch.theme) setTheme(patch.theme)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(next), 300)
  }, [values, save, setTheme])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("preferences.title")}</CardTitle>
            <CardDescription>{t("preferences.description")}</CardDescription>
          </div>
          <div className="h-4">
            {status === "saving" && <p className="text-xs text-muted-foreground">{t("notificationsForm.saving")}</p>}
            {status === "saved" && <p className="text-xs text-muted-foreground">{t("notificationsForm.saved")}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="theme">{t("preferences.theme")}</Label>
          <Select value={values.theme} onValueChange={(v) => update({ theme: v })}>
            <SelectTrigger id="theme">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((themeOption) => (
                <SelectItem key={themeOption.value} value={themeOption.value}>
                  {themeOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{t("preferences.themeDescription")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">{t("preferences.language")}</Label>
          <Select value={values.locale} onValueChange={(v) => update({ locale: v })}>
            <SelectTrigger id="locale">
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{t("preferences.languageDescription")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
