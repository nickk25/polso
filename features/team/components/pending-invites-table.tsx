"use client"

import { useState, useTransition } from "react"
import {
  Copy,
  ArrowClockwise,
  X,
  EnvelopeSimple,
  CheckCircle,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
} from "@/components/ui/alert-dialog"
import { revokeInviteAction } from "../actions/revoke-invite"
import { resendInviteAction } from "../actions/resend-invite"
import type { PendingInvite } from "../queries/get-pending-invites"

interface PendingInvitesTableProps {
  invites: PendingInvite[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return "Expired"
  if (diffDays === 1) return "1 day"
  return `${diffDays} days`
}

function EmailStatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "sent":
    case "delivered":
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </TooltipTrigger>
          <TooltipContent>Email {status}</TooltipContent>
        </Tooltip>
      )
    case "bounced":
    case "failed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <WarningCircle className="h-4 w-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>Email {status}</TooltipContent>
        </Tooltip>
      )
    default:
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Pending</TooltipContent>
        </Tooltip>
      )
  }
}

function InviteActions({ invite }: { invite: PendingInvite }) {
  const [isResending, startResend] = useTransition()
  const [isRevoking, startRevoke] = useTransition()
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.id}`

  const handleCopyLink = async () => {
    // In a real app, we'd need the token, not the ID
    // For now, we'll just show a message
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResend = () => {
    startResend(async () => {
      await resendInviteAction(invite.id)
    })
  }

  const handleRevoke = () => {
    startRevoke(async () => {
      await revokeInviteAction(invite.id)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyLink}
            disabled={copied}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy invite link"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleResend}
            disabled={isResending}
          >
            <ArrowClockwise className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Resend invitation</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={isRevoking}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Revoke invitation</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation sent to {invite.email}. They won&apos;t
              be able to join your organization with this link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function PendingInvitesTable({ invites }: PendingInvitesTableProps) {
  if (invites.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Pending Invitations</h3>
        <Badge variant="secondary">{invites.length}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id}>
              <TableCell className="font-medium">{invite.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {invite.role}
                </Badge>
              </TableCell>
              <TableCell>
                <EmailStatusIcon status={invite.emailStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeTime(invite.expiresAt)}
              </TableCell>
              <TableCell>
                <InviteActions invite={invite} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
