"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { updatePreferencesAction } from "../actions/update-preferences";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const LOCALES = [
  { value: "en-US", label: "English" },
  { value: "es-ES", label: "Español" },
];

interface PreferencesFormProps {
  preferences: {
    theme: string;
    locale: string;
    compactMode: boolean;
  };
}

export function PreferencesForm({ preferences }: PreferencesFormProps) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(preferences.theme);
  const [locale, setLocale] = useState(preferences.locale);
  const [compactMode, setCompactMode] = useState(preferences.compactMode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await updatePreferencesAction({
      theme,
      locale,
      compactMode,
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t("preferences.title")}</CardTitle>
          <CardDescription>
            {t("preferences.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">{t("preferences.theme")}</Label>
            <Select value={theme} onValueChange={setTheme}>
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
            <p className="text-sm text-muted-foreground">
              {t("preferences.themeDescription")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">{t("preferences.language")}</Label>
            <Select value={locale} onValueChange={setLocale}>
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
            <p className="text-sm text-muted-foreground">
              {t("preferences.languageDescription")}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="compactMode">{t("preferences.compactMode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("preferences.compactModeDescription")}
              </p>
            </div>
            <Switch
              id="compactMode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? tc("actions.saving") : tc("actions.saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
