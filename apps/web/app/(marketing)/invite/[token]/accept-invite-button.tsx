"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CheckCircle, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { acceptInviteAction } from "@/features/team/actions/accept-invite"

interface AcceptInviteButtonProps {
  token: string
  /** Pre-fetched: org id when user has exactly one client org (partner_client invitations). */
  singleClientOrgId?: string
  singleClientOrgName?: string
}

export function AcceptInviteButton({ token, singleClientOrgId, singleClientOrgName }: AcceptInviteButtonProps) {
  const router = useRouter()
  const t = useTranslations("invite")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orgChoices, setOrgChoices] = useState<{ id: string; name: string }[] | null>(null)
  const [chosenOrgId, setChosenOrgId] = useState<string>("")

  const handleAccept = (orgId?: string) => {
    setError(null)

    startTransition(async () => {
      const result = await acceptInviteAction(token, orgId ?? singleClientOrgId)

      if (!result.success) {
        setError(result.error)
        return
      }

      if (result.data.kind === "needs_org_selection") {
        const orgs = result.data.availableOrgs
        setOrgChoices(orgs)
        if (orgs[0]) setChosenOrgId(orgs[0].id)
        return
      }

      setSuccess(true)
      const partnerUrl = process.env.NEXT_PUBLIC_PARTNER_APP_URL
      const destination =
        result.data.orgType === "partner" && partnerUrl
          ? `${partnerUrl}/dashboard`
          : "/dashboard"
      setTimeout(() => router.push(destination), 1500)
    })
  }

  if (success) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{t("welcomeToTeam")}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("redirecting")}</p>
      </div>
    )
  }

  if (orgChoices) {
    return (
      <div className="w-full space-y-3">
        <p className="text-sm text-muted-foreground">{t("selectOrgToLink")}</p>
        <Select value={chosenOrgId} onValueChange={setChosenOrgId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {orgChoices.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-full"
          onClick={() => handleAccept(chosenOrgId)}
          disabled={isPending || !chosenOrgId}
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
              {t("accepting")}
            </>
          ) : (
            t("linkAndAccept")
          )}
        </Button>
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  const label = singleClientOrgName
    ? t("acceptAndLink", { orgName: singleClientOrgName })
    : t("acceptInvitation")

  return (
    <div className="w-full space-y-2">
      <Button className="w-full" onClick={() => handleAccept()} disabled={isPending}>
        {isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4 animate-spin" />
            {t("accepting")}
          </>
        ) : (
          label
        )}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  )
}
