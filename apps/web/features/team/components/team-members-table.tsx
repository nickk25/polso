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
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { changeMemberRoleAction, removeMemberAction } from "../actions/manage-member"
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
  const [isChangingRole, startChangeRole] = useTransition()
  const [isRemoving, startRemove] = useTransition()
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const isCurrentUser = member.userId === currentUserId
  const isOwner = currentUserRole === "owner"
  const canManage = isOwner && !isCurrentUser && member.role !== "owner"

  if (!canManage) {
    return null
  }

  const handleChangeRole = (newRole: "admin" | "member") => {
    startChangeRole(async () => {
      await changeMemberRoleAction(member.userId, newRole)
    })
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
            disabled={isChangingRole || isRemoving}
          >
            <DotsThree className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {member.role === "member" && (
            <DropdownMenuItem onClick={() => handleChangeRole("admin")}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              {t("members.makeAdmin")}
            </DropdownMenuItem>
          )}
          {member.role === "admin" && (
            <DropdownMenuItem onClick={() => handleChangeRole("member")}>
              <User className="h-4 w-4 mr-2" />
              {t("members.makeMember")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      User {member.userId.slice(0, 8)}...
                    </span>
                    {member.userId === currentUserId && (
                      <span className="text-xs text-muted-foreground">{t("members.you")}</span>
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
