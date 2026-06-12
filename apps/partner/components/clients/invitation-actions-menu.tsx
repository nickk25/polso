"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DotsThree, PaperPlaneTilt, PencilSimple, Link, Prohibit } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@polso/ui/alert-dialog"
import { EditInviteEmailDialog } from "./edit-invite-email-dialog"
import { resendPartnerInviteAction } from "@/features/clients/actions/resend-invite"
import { revokePartnerInviteAction } from "@/features/clients/actions/revoke-invite"
import { hoursAgo } from "@/lib/time"

interface InvitationActionsMenuProps {
  invitationId: string
  email: string
  token: string
  status: "pending" | "expired" | "revoked"
  emailSentAt: Date | null
}

export function InvitationActionsMenu({
  invitationId,
  email,
  token,
  status,
  emailSentAt,
}: InvitationActionsMenuProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const isActive = status === "pending"

  // Rate-limit guard: resend disabled if sent within last hour
  const rateLimited = isActive && emailSentAt != null && emailSentAt > hoursAgo(1)

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendPartnerInviteAction(invitationId)
      if (result.success) {
        toast.success("Email reenviado")
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await revokePartnerInviteAction(invitationId)
      if (result.success) {
        toast.success("Invitación revocada")
      } else {
        toast.error(result.error)
      }
      setRevokeOpen(false)
    })
  }

  const handleCopyLink = () => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Enlace copiado")
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isPending}>
            <DotsThree className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleResend}
            disabled={!isActive || rateLimited || isPending}
          >
            <PaperPlaneTilt className="mr-2 h-4 w-4" />
            {rateLimited ? "Reenviar (límite 1h)" : "Reenviar email"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setEditOpen(true)}
            disabled={!isActive || isPending}
          >
            <PencilSimple className="mr-2 h-4 w-4" />
            Editar email
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyLink}>
            <Link className="mr-2 h-4 w-4" />
            Copiar enlace
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setRevokeOpen(true)}
            disabled={!isActive || isPending}
            className="text-destructive focus:text-destructive"
          >
            <Prohibit className="mr-2 h-4 w-4" />
            Revocar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditInviteEmailDialog
        invitationId={invitationId}
        currentEmail={email}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar invitación</AlertDialogTitle>
            <AlertDialogDescription>
              El enlace de invitación dejará de funcionar. Podrás enviar una nueva invitación en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revocar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
