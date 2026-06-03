"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Input } from "@polso/ui/input"
import { Button } from "@polso/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@polso/ui/dialog"
import { updatePartnerInviteEmailAction } from "@/features/clients/actions/update-invite-email"

interface EditInviteEmailDialogProps {
  invitationId: string
  currentEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInviteEmailDialog({
  invitationId,
  currentEmail,
  open,
  onOpenChange,
}: EditInviteEmailDialogProps) {
  const [email, setEmail] = useState(currentEmail)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updatePartnerInviteEmailAction(invitationId, email)
      if (result.success) {
        toast.success("Email actualizado y reenvíado")
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar email de invitación</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nuevo@email.com"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            El enlace anterior quedará inválido. Se enviará un nuevo email automáticamente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !email.includes("@")}>
            {isPending ? "Guardando..." : "Guardar y reenviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
