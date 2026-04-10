"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
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
} from "@polso/ui/table"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@polso/ui/tooltip"
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
  const t = useTranslations("team")
  switch (status) {
    case "sent":
    case "delivered":
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </TooltipTrigger>
          <TooltipContent>{t("pending.emailStatus", { status })}</TooltipContent>
        </Tooltip>
      )
    case "bounced":
    case "failed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <WarningCircle className="h-4 w-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>{t("pending.emailStatus", { status })}</TooltipContent>
        </Tooltip>
      )
    default:
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{t("pending.pending")}</TooltipContent>
        </Tooltip>
      )
  }
}

function InviteActions({ invite }: { invite: PendingInvite }) {
  const t = useTranslations("team")
  const tc = useTranslations("common")
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
        <TooltipContent>{copied ? t("pending.copied") : t("pending.copyLink")}</TooltipContent>
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
        <TooltipContent>{t("pending.resend")}</TooltipContent>
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
          <TooltipContent>{t("pending.revoke")}</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pending.revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pending.revokeDescription", { email: invite.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              {t("pending.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function PendingInvitesTable({ invites }: PendingInvitesTableProps) {
  const t = useTranslations("team")

  if (invites.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("pending.title")}</h3>
        <Badge variant="secondary">{invites.length}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("pending.email")}</TableHead>
            <TableHead>{t("pending.role")}</TableHead>
            <TableHead>{t("pending.status")}</TableHead>
            <TableHead>{t("pending.expires")}</TableHead>
            <TableHead className="w-[100px]">{t("pending.actions")}</TableHead>
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
