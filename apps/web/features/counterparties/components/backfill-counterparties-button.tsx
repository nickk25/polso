"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Sparkle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillCounterpartiesAction } from "../actions/backfill-counterparties"

export function BackfillCounterpartiesButton() {
  const t = useTranslations("counterparties")
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const response = await backfillCounterpartiesAction()
    setLoading(false)

    if (response.success && response.data) {
      const { counterpartiesCreated, entriesLinked } = response.data

      if (counterpartiesCreated === 0 && entriesLinked === 0) {
        toast.info(t("backfill.noNewVendors"), { description: t("backfill.allAssigned") })
      } else if (counterpartiesCreated > 0) {
        toast.success(t("backfill.created", { count: counterpartiesCreated }), {
          description: t("backfill.linked", { count: entriesLinked }),
        })
      } else {
        toast.success(t("backfill.linkedOnly", { count: entriesLinked }), {
          description: t("backfill.linkedDescription"),
        })
      }

      router.refresh()
    } else {
      toast.error(t("backfill.failed"), {
        description: "error" in response ? response.error : "An error occurred.",
      })
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
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
