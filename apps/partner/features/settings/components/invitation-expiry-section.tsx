"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { Button } from "@polso/ui/button"
import { updateInvitationExpiryAction } from "../actions/update-invitation-expiry"

export function InvitationExpirySection({ days }: { days: number }) {
  const initialValue = String(days)
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const hasChanges = value !== initialValue

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(value, 10)
    startTransition(async () => {
      const res = await updateInvitationExpiryAction(parsed)
      if (res.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="expiry-days">Días de validez de las invitaciones</Label>
        <Input
          id="expiry-days"
          type="number"
          min={1}
          max={30}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">Entre 1 y 30 días</p>
      </div>
      <Button type="submit" disabled={isPending || !hasChanges}>
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}
