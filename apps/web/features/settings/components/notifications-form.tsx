"use client"

import { useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { Switch } from "@polso/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { updateNotificationsAction } from "../actions/update-notifications"

interface NotificationsFormProps {
  settings: {
    emailAlerts: boolean
    emailWeeklyDigest: boolean
    emailLowBalance: boolean
    emailSyncErrors: boolean
    inAppAlerts: boolean
    lowBalanceThreshold: number | null
    highExpenseThreshold: number | null
    emailHighSpend: boolean
    emailRunwayCritical: boolean
    emailUnusualActivity: boolean
    runwayThreshold: number | null
    unusualMultiplier: number | null
  }
}

type Values = {
  emailAlerts: boolean
  emailWeeklyDigest: boolean
  emailLowBalance: boolean
  emailSyncErrors: boolean
  inAppAlerts: boolean
  lowBalanceThreshold: string
  highExpenseThreshold: string
  emailHighSpend: boolean
  emailRunwayCritical: boolean
  emailUnusualActivity: boolean
  runwayThreshold: string
  unusualMultiplier: string
}

export function NotificationsForm({ settings }: NotificationsFormProps) {
  const t = useTranslations("settings")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  const [values, setValues] = useState<Values>({
    emailAlerts: settings.emailAlerts,
    emailWeeklyDigest: settings.emailWeeklyDigest,
    emailLowBalance: settings.emailLowBalance,
    emailSyncErrors: settings.emailSyncErrors,
    inAppAlerts: settings.inAppAlerts,
    lowBalanceThreshold: settings.lowBalanceThreshold?.toString() ?? "",
    highExpenseThreshold: settings.highExpenseThreshold?.toString() ?? "",
    emailHighSpend: settings.emailHighSpend,
    emailRunwayCritical: settings.emailRunwayCritical,
    emailUnusualActivity: settings.emailUnusualActivity,
    runwayThreshold: settings.runwayThreshold?.toString() ?? "3",
    unusualMultiplier: settings.unusualMultiplier?.toString() ?? "2",
  })

  const save = useCallback(async (next: Values) => {
    setStatus("saving")
    await updateNotificationsAction({
      emailAlerts: next.emailAlerts,
      emailWeeklyDigest: next.emailWeeklyDigest,
      emailLowBalance: next.emailLowBalance,
      emailSyncErrors: next.emailSyncErrors,
      inAppAlerts: next.inAppAlerts,
      lowBalanceThreshold: next.lowBalanceThreshold ? parseFloat(next.lowBalanceThreshold) : null,
      highExpenseThreshold: next.highExpenseThreshold ? parseFloat(next.highExpenseThreshold) : null,
      emailHighSpend: next.emailHighSpend,
      emailRunwayCritical: next.emailRunwayCritical,
      emailUnusualActivity: next.emailUnusualActivity,
      runwayThreshold: next.runwayThreshold ? parseFloat(next.runwayThreshold) : null,
      unusualMultiplier: next.unusualMultiplier ? parseFloat(next.unusualMultiplier) : null,
    })
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 1500)
  }, [])

  const update = useCallback((patch: Partial<Values>, debounceMs = 300) => {
    const next = { ...values, ...patch }
    setValues(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(next), debounceMs)
  }, [values, save])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between h-5">
        {status === "saving" && (
          <p className="text-xs text-muted-foreground">{t("notificationsForm.saving")}</p>
        )}
        {status === "saved" && (
          <p className="text-xs text-muted-foreground">{t("notificationsForm.saved")}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.emailTitle")}</CardTitle>
          <CardDescription>{t("notificationsForm.emailDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailAlerts">{t("notificationsForm.emailAlerts")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.emailAlertsDescription")}</p>
            </div>
            <Switch
              id="emailAlerts"
              checked={values.emailAlerts}
              onCheckedChange={(v) => update({ emailAlerts: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailWeeklyDigest">{t("notificationsForm.weeklyDigest")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.weeklyDigestDescription")}</p>
            </div>
            <Switch
              id="emailWeeklyDigest"
              checked={values.emailWeeklyDigest}
              onCheckedChange={(v) => update({ emailWeeklyDigest: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailLowBalance">{t("notificationsForm.lowBalanceAlerts")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.lowBalanceAlertsDescription")}</p>
            </div>
            <Switch
              id="emailLowBalance"
              checked={values.emailLowBalance}
              onCheckedChange={(v) => update({ emailLowBalance: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailSyncErrors">{t("notificationsForm.syncErrorAlerts")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.syncErrorAlertsDescription")}</p>
            </div>
            <Switch
              id="emailSyncErrors"
              checked={values.emailSyncErrors}
              onCheckedChange={(v) => update({ emailSyncErrors: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.inAppTitle")}</CardTitle>
          <CardDescription>{t("notificationsForm.inAppDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="inAppAlerts">{t("notificationsForm.inAppAlerts")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.inAppAlertsDescription")}</p>
            </div>
            <Switch
              id="inAppAlerts"
              checked={values.inAppAlerts}
              onCheckedChange={(v) => update({ inAppAlerts: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.thresholdsTitle")}</CardTitle>
          <CardDescription>{t("notificationsForm.thresholdsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lowBalanceThreshold">{t("notificationsForm.lowBalanceThreshold")}</Label>
            <Input
              id="lowBalanceThreshold"
              type="number"
              placeholder={t("notificationsForm.lowBalanceThresholdPlaceholder")}
              value={values.lowBalanceThreshold}
              onChange={(e) => update({ lowBalanceThreshold: e.target.value }, 800)}
            />
            <p className="text-sm text-muted-foreground">{t("notificationsForm.lowBalanceThresholdDescription")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="highExpenseThreshold">{t("notificationsForm.highExpenseThreshold")}</Label>
            <Input
              id="highExpenseThreshold"
              type="number"
              placeholder={t("notificationsForm.highExpenseThresholdPlaceholder")}
              value={values.highExpenseThreshold}
              onChange={(e) => update({ highExpenseThreshold: e.target.value }, 800)}
            />
            <p className="text-sm text-muted-foreground">{t("notificationsForm.highExpenseThresholdDescription")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.alertTypesTitle")}</CardTitle>
          <CardDescription>{t("notificationsForm.alertTypesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailHighSpend">{t("notificationsForm.emailHighSpend")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.emailHighSpendDescription")}</p>
            </div>
            <Switch
              id="emailHighSpend"
              checked={values.emailHighSpend}
              onCheckedChange={(v) => update({ emailHighSpend: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailRunwayCritical">{t("notificationsForm.emailRunwayCritical")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.emailRunwayCriticalDescription")}</p>
            </div>
            <Switch
              id="emailRunwayCritical"
              checked={values.emailRunwayCritical}
              onCheckedChange={(v) => update({ emailRunwayCritical: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailUnusualActivity">{t("notificationsForm.emailUnusualActivity")}</Label>
              <p className="text-sm text-muted-foreground">{t("notificationsForm.emailUnusualActivityDescription")}</p>
            </div>
            <Switch
              id="emailUnusualActivity"
              checked={values.emailUnusualActivity}
              onCheckedChange={(v) => update({ emailUnusualActivity: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="runwayThreshold">{t("notificationsForm.runwayThreshold")}</Label>
            <Input
              id="runwayThreshold"
              type="number"
              placeholder={t("notificationsForm.runwayThresholdPlaceholder")}
              value={values.runwayThreshold}
              onChange={(e) => update({ runwayThreshold: e.target.value }, 800)}
            />
            <p className="text-sm text-muted-foreground">{t("notificationsForm.runwayThresholdDescription")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unusualMultiplier">{t("notificationsForm.unusualMultiplier")}</Label>
            <Input
              id="unusualMultiplier"
              type="number"
              placeholder={t("notificationsForm.unusualMultiplierPlaceholder")}
              value={values.unusualMultiplier}
              onChange={(e) => update({ unusualMultiplier: e.target.value }, 800)}
            />
            <p className="text-sm text-muted-foreground">{t("notificationsForm.unusualMultiplierDescription")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
