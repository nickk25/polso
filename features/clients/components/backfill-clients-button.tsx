"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner, Sparkle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillClientsAction } from "../actions/backfill-clients"

export function BackfillClientsButton() {
  const t = useTranslations("clients")
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleBackfill = async () => {
    setLoading(true)

    const result = await backfillClientsAction()

    if (!result.success) {
      toast.error(t("backfill.failed"), {
        description: result.error,
      })
      setLoading(false)
      return
    }

    const { clientsCreated, incomesLinked, alreadyLinked } = result.data

    if (clientsCreated === 0 && alreadyLinked === 0) {
      toast.info(t("backfill.noClientsToCreate"), {
        description: t("backfill.allAssigned"),
      })
    } else {
      toast.success(t("backfill.created"), {
        description: `${t("backfill.createdCount", { count: clientsCreated })}, ${t("backfill.linked", { count: incomesLinked })}.`,
      })
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleBackfill} disabled={loading}>
      {loading ? (
        <>
          <Spinner className="h-4 w-4 mr-2 animate-spin" />
          {t("backfill.creating")}
        </>
      ) : (
        <>
          <Sparkle weight="fill" className="h-4 w-4 mr-2" />
          {t("backfill.createFromTransactions")}
        </>
      )}
    </Button>
  )
}
