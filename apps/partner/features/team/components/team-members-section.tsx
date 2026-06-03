"use client"

import { useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Trash } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@polso/ui/avatar"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { removeTeammateAction } from "../actions/remove-teammate"
import { revokeTeammateInvitationAction } from "../actions/revoke-teammate-invitation"
import type { TeamMember, TeamInvitation } from "../queries/get-team-data"
import { getInitials } from "@/lib/format"

export function TeamMembersSection({
  members,
  invitations,
  currentUserId,
}: {
  members: TeamMember[]
  invitations: TeamInvitation[]
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove(userOrgId: string) {
    startTransition(async () => {
      const res = await removeTeammateAction(userOrgId)
      if (res.success) {
        toast.success("Miembro eliminado")
      } else {
        toast.error(res.error ?? "Error al eliminar el miembro")
      }
    })
  }

  function handleRevoke(invitationId: string) {
    startTransition(async () => {
      const res = await revokeTeammateInvitationAction(invitationId)
      if (res.success) {
        toast.success("Invitación revocada")
      } else {
        toast.error(res.error ?? "Error al revocar la invitación")
      }
    })
  }

  const hasRows = members.length > 0 || invitations.length > 0

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.image ?? undefined} alt={member.name ?? member.email ?? "Usuario"} />
                    <AvatarFallback delayMs={0} className="text-xs">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.name || member.email?.split("@")[0] || member.userId.slice(0, 12) + "…"}
                      {member.userId === currentUserId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>
                      )}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="default">Activo</Badge>
              </TableCell>
              <TableCell>
                {member.userId !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending} className="h-8 w-8">
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este usuario perderá acceso al panel. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(member.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
          {invitations.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback delayMs={0} className="text-xs">
                      {getInitials(null, inv.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email.split("@")[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">Pendiente</Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  className="h-8 w-8"
                  onClick={() => handleRevoke(inv.id)}
                  title="Revocar invitación"
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!hasRows && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                Sin miembros ni invitaciones pendientes
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
