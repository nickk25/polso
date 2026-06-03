"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Switch } from "@polso/ui/switch"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { updateNotificationSettingsAction } from "../actions/update-notification-settings"

interface Props {
  digestCadence: string
  notifyOnClientConnected: boolean
}

export function NotificationSettingsSection({
  digestCadence: initialCadence,
  notifyOnClientConnected: initialNotify,
}: Props) {
  const [cadence, setCadence] = useState(initialCadence)
  const [notify, setNotify] = useState(initialNotify)
  const [isPending, startTransition] = useTransition()

  function save(updates: Partial<{ cadence: string; notify: boolean }>) {
    const newCadence = updates.cadence ?? cadence
    const newNotify = updates.notify ?? notify
    startTransition(async () => {
      const res = await updateNotificationSettingsAction({
        digestCadence: newCadence,
        notifyOnClientConnected: newNotify,
      })
      if (res.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="notify-client"
          checked={notify}
          onCheckedChange={(v) => { setNotify(v); save({ notify: v }) }}
          disabled={isPending}
        />
        <Label htmlFor="notify-client">Notificarme cuando un cliente conecte su banco</Label>
      </div>

      <div className="space-y-2">
        <Label>Resumen por email</Label>
        <Select
          value={cadence}
          onValueChange={(v) => { setCadence(v); save({ cadence: v }) }}
          disabled={isPending}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Desactivado</SelectItem>
            <SelectItem value="daily" disabled>Diario (próximamente)</SelectItem>
            <SelectItem value="weekly">Semanal (lunes)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">El resumen semanal se envía los lunes por la mañana.</p>
      </div>
    </div>
  )
}
