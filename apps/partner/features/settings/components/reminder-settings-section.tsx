"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Switch } from "@polso/ui/switch"
import { Label } from "@polso/ui/label"
import { Input } from "@polso/ui/input"
import { Button } from "@polso/ui/button"
import { updateReminderSettingsAction } from "../actions/update-reminder-settings"

interface Props {
  reminderCooldownHours: number
  receiptReminderHours: number
  autoRemindersEnabled: boolean
}

export function ReminderSettingsSection({
  reminderCooldownHours: initialCooldown,
  receiptReminderHours: initialCadence,
  autoRemindersEnabled: initialEnabled,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [cooldown, setCooldown] = useState(String(initialCooldown))
  const [cadence, setCadence] = useState(String(initialCadence))
  const [isPending, startTransition] = useTransition()
  const hasChanges =
    enabled !== initialEnabled ||
    cooldown !== String(initialCooldown) ||
    cadence !== String(initialCadence)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const cooldownHours = parseInt(cooldown, 10)
    const cadenceHours = parseInt(cadence, 10)
    startTransition(async () => {
      const res = await updateReminderSettingsAction({
        autoRemindersEnabled: enabled,
        reminderCooldownHours: cooldownHours,
        receiptReminderHours: cadenceHours,
      })
      if (res.success) {
        toast.success("Configuración guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="auto-reminders"
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={isPending}
        />
        <Label htmlFor="auto-reminders">Recordatorios automáticos activos</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cooldown-hours">Cooldown entre recordatorios manuales (horas)</Label>
          <Input
            id="cooldown-hours"
            type="number"
            min={1}
            max={168}
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">Entre 1 y 168 horas</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cadence-hours">Cadencia de recordatorios de recibos (horas)</Label>
          <Input
            id="cadence-hours"
            type="number"
            min={24}
            max={720}
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">Entre 24 y 720 horas</p>
        </div>
      </div>

      <Button type="submit" disabled={isPending || !hasChanges}>
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}
