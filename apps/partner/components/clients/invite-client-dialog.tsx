"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { UserPlus } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@polso/ui/dialog"
import { inviteClientAction } from "@/features/clients/actions/invite-client"

export function InviteClientDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ clientName: "", email: "" })
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await inviteClientAction(form)
      if (result.success) {
        toast.success("Invitación enviada")
        setOpen(false)
        setForm({ clientName: "", email: "" })
      } else {
        toast.error(result.error ?? "Error al enviar la invitación")
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invitar cliente
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm({ clientName: "", email: "" }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente / empresa</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder="Nombre de la empresa o autónomo"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@ejemplo.com"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !form.clientName || !form.email}>
                {isPending ? "Enviando..." : "Enviar invitación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
