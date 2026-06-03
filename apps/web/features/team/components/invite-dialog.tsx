"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { UserPlus } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@polso/ui/dialog"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { sendInviteAction } from "../actions/send-invite"
import { InlineUpgrade } from "@/components/shared/upgrade-prompt"
import type { PlanType } from "@/lib/plans"

interface InviteDialogProps {
  disabled?: boolean
  currentPlan?: PlanType
}

export function InviteDialog({ disabled, currentPlan }: InviteDialogProps) {
  const t = useTranslations("team")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"member" | "admin">("member")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await sendInviteAction({ email, role })

      if (result.success) {
        setOpen(false)
        setEmail("")
        setRole("member")
      } else {
        setError(result.error)
      }
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("")
      setRole("member")
      setError(null)
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("invite.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("invite.title")}</DialogTitle>
            <DialogDescription>
              {t("invite.description")}
            </DialogDescription>
          </DialogHeader>

          {disabled ? (
            <div className="py-4">
              <InlineUpgrade
                message={t("invite.limitReached")}
              />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("invite.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("invite.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">{t("invite.role")}</Label>
                <Select
                  value={role}
                  onValueChange={(value: "member" | "admin") => setRole(value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder={t("invite.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex flex-col items-start">
                        <span>{t("invite.memberRole")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("invite.memberDescription")}
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span>{t("invite.adminRole")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("invite.adminDescription")}
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {!disabled && (
              <Button type="submit" disabled={isPending || !email}>
                {isPending ? t("invite.sending") : t("invite.sendInvitation")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
