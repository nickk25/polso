"use client"

import { useTheme } from "next-themes"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"

const THEMES = [
  { value: "system", label: "Sistema" },
  { value: "light",  label: "Claro" },
  { value: "dark",   label: "Oscuro" },
]

export function ThemeSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-2">
      <Label htmlFor="theme">Tema</Label>
      <Select value={theme ?? "system"} onValueChange={setTheme}>
        <SelectTrigger id="theme" className="max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THEMES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Elige entre claro, oscuro o seguir la preferencia del sistema.
      </p>
    </div>
  )
}
