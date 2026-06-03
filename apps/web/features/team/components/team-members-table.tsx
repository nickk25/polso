"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { DotsThree, Crown, ShieldCheck, User, SignOut } from "@phosphor-icons/react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@polso/ui/avatar"
import { removeMemberAction } from "../actions/manage-member"
import type { TeamMember } from "../queries/get-team-members"

interface TeamMembersTableProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: string
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case "owner":
      return <Crown className="h-3 w-3" />
    case "admin":
      return <ShieldCheck className="h-3 w-3" />
    default:
      return <User className="h-3 w-3" />
  }
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    owner: "default",
    admin: "secondary",
    member: "outline",
  }

  return (
    <Badge variant={variants[role] ?? "outline"} className="capitalize gap-1">
      <RoleIcon role={role} />
      {role}
    </Badge>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function MemberActions({
  member,
  currentUserId,
  currentUserRole,
}: {
  member: TeamMember
  currentUserId: string
  currentUserRole: string
}) {
  const t = useTranslations("team")
  const tc = useTranslations("common")
  const [isRemoving, startRemove] = useTransition()
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const isCurrentUser = member.userId === currentUserId
  const isOwner = currentUserRole === "owner"
  const canManage = isOwner && !isCurrentUser && member.role !== "owner"

  if (!canManage) {
    return null
  }

  const handleRemove = () => {
    startRemove(async () => {
      await removeMemberAction(member.userId)
      setShowRemoveDialog(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isRemoving}
          >
            <DotsThree className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowRemoveDialog(true)}
          >
            <SignOut className="h-4 w-4 mr-2" />
            {t("members.removeFromTeam")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("members.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("members.removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function TeamMembersTable({
  members,
  currentUserId,
  currentUserRole,
}: TeamMembersTableProps) {
  const t = useTranslations("team")

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("members.title")}</h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("members.member")}</TableHead>
            <TableHead>{t("members.role")}</TableHead>
            <TableHead>{t("members.joined")}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image ?? undefined} />
                    <AvatarFallback delayMs={0} className="text-xs bg-muted text-muted-foreground">
                      {member.name
                        ? member.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                        : member.email
                          ? member.email[0].toUpperCase()
                          : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {member.name ?? member.email ?? member.userId.slice(0, 12) + "…"}
                      {member.userId === currentUserId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t("members.you")})</span>
                      )}
                    </span>
                    {member.name && member.email && (
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <RoleBadge role={member.role} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(member.createdAt)}
              </TableCell>
              <TableCell>
                <MemberActions
                  member={member}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
