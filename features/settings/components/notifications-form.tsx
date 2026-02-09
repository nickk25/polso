"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  }
}

export function NotificationsForm({ settings }: NotificationsFormProps) {
  const router = useRouter()
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [loading, setLoading] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(settings.emailAlerts)
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(settings.emailWeeklyDigest)
  const [emailLowBalance, setEmailLowBalance] = useState(settings.emailLowBalance)
  const [emailSyncErrors, setEmailSyncErrors] = useState(settings.emailSyncErrors)
  const [inAppAlerts, setInAppAlerts] = useState(settings.inAppAlerts)
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(
    settings.lowBalanceThreshold?.toString() ?? ""
  )
  const [highExpenseThreshold, setHighExpenseThreshold] = useState(
    settings.highExpenseThreshold?.toString() ?? ""
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await updateNotificationsAction({
      emailAlerts,
      emailWeeklyDigest,
      emailLowBalance,
      emailSyncErrors,
      inAppAlerts,
      lowBalanceThreshold: lowBalanceThreshold ? parseFloat(lowBalanceThreshold) : null,
      highExpenseThreshold: highExpenseThreshold ? parseFloat(highExpenseThreshold) : null,
    })

    setLoading(false)

    if (result.success) {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.emailTitle")}</CardTitle>
          <CardDescription>
            {t("notificationsForm.emailDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailAlerts">{t("notificationsForm.emailAlerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("notificationsForm.emailAlertsDescription")}
              </p>
            </div>
            <Switch
              id="emailAlerts"
              checked={emailAlerts}
              onCheckedChange={setEmailAlerts}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailWeeklyDigest">{t("notificationsForm.weeklyDigest")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("notificationsForm.weeklyDigestDescription")}
              </p>
            </div>
            <Switch
              id="emailWeeklyDigest"
              checked={emailWeeklyDigest}
              onCheckedChange={setEmailWeeklyDigest}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailLowBalance">{t("notificationsForm.lowBalanceAlerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("notificationsForm.lowBalanceAlertsDescription")}
              </p>
            </div>
            <Switch
              id="emailLowBalance"
              checked={emailLowBalance}
              onCheckedChange={setEmailLowBalance}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailSyncErrors">{t("notificationsForm.syncErrorAlerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("notificationsForm.syncErrorAlertsDescription")}
              </p>
            </div>
            <Switch
              id="emailSyncErrors"
              checked={emailSyncErrors}
              onCheckedChange={setEmailSyncErrors}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.inAppTitle")}</CardTitle>
          <CardDescription>
            {t("notificationsForm.inAppDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="inAppAlerts">{t("notificationsForm.inAppAlerts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("notificationsForm.inAppAlertsDescription")}
              </p>
            </div>
            <Switch
              id="inAppAlerts"
              checked={inAppAlerts}
              onCheckedChange={setInAppAlerts}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsForm.thresholdsTitle")}</CardTitle>
          <CardDescription>
            {t("notificationsForm.thresholdsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lowBalanceThreshold">{t("notificationsForm.lowBalanceThreshold")}</Label>
            <Input
              id="lowBalanceThreshold"
              type="number"
              placeholder={t("notificationsForm.lowBalanceThresholdPlaceholder")}
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {t("notificationsForm.lowBalanceThresholdDescription")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="highExpenseThreshold">{t("notificationsForm.highExpenseThreshold")}</Label>
            <Input
              id="highExpenseThreshold"
              type="number"
              placeholder={t("notificationsForm.highExpenseThresholdPlaceholder")}
              value={highExpenseThreshold}
              onChange={(e) => setHighExpenseThreshold(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {t("notificationsForm.highExpenseThresholdDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? tc("actions.saving") : tc("actions.saveChanges")}
      </Button>
    </form>
  )
}
