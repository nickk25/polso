"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure which email notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailAlerts">Email Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive important alerts via email
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
              <Label htmlFor="emailWeeklyDigest">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Get a weekly summary of your financial activity
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
              <Label htmlFor="emailLowBalance">Low Balance Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when account balance is low
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
              <Label htmlFor="emailSyncErrors">Sync Error Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when bank sync fails
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
          <CardTitle>In-App Notifications</CardTitle>
          <CardDescription>
            Configure in-app notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="inAppAlerts">In-App Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Show alerts within the application
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
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>
            Set thresholds for automatic alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lowBalanceThreshold">Low Balance Threshold</Label>
            <Input
              id="lowBalanceThreshold"
              type="number"
              placeholder="e.g., 1000"
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get alerted when any account balance falls below this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="highExpenseThreshold">High Expense Threshold</Label>
            <Input
              id="highExpenseThreshold"
              type="number"
              placeholder="e.g., 500"
              value={highExpenseThreshold}
              onChange={(e) => setHighExpenseThreshold(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get alerted when a single expense exceeds this amount
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
