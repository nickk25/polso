"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@polso/ui/alert-dialog"
import { BellRinging } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { sendBulkReminderAction } from "@/features/proactive/actions/send-bulk-reminder"

interface BulkReminderButtonProps {
  incompleteCount: number
}

export function BulkReminderButton({ incompleteCount }: BulkReminderButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    const result = await sendBulkReminderAction("incomplete")
    setLoading(false)

    if (result.success) {
      const { sent, skipped } = result.data
      if (sent === 0) {
        toast.info("Sin envíos — todos los clientes ya están al día o sin canal configurado")
      } else {
        toast.success(`Enviados ${sent}${skipped > 0 ? ` · Omitidos ${skipped}` : ""}`)
      }
    } else {
      toast.error(result.error ?? "Error al enviar recordatorios")
    }
  }

  if (incompleteCount === 0) return null

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <BellRinging className="mr-1.5 h-3.5 w-3.5" />
          {loading ? "Enviando…" : "Recordar a todos"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar recordatorio de comprobantes</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará un mensaje de recordatorio a los {incompleteCount} clientes con cobertura
            incompleta este mes. Solo se enviará a clientes con canal de comunicación configurado
            (Telegram o WhatsApp).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Enviar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
