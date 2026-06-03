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
import { inviteTeammateAction } from "../actions/invite-teammate"

export function InviteTeammateDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    if (isPending) return
    setOpen(false)
    setTimeout(() => setEmail(""), 200)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await inviteTeammateAction(email)
      if (res.success) {
        toast.success("Invitación enviada")
        handleClose()
      } else {
        toast.error(res.error ?? "Error al enviar la invitación")
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invitar miembro
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invitar miembro al equipo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teammate-email">Email</Label>
              <Input
                id="teammate-email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!email || isPending}>
                {isPending ? "Enviando..." : "Invitar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
