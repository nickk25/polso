"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillVendorsAction } from "../actions/backfill-vendors"

export function BackfillVendorsButton() {
  const t = useTranslations("vendors")
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    const response = await backfillVendorsAction()

    setLoading(false)

    if (response.success && response.data) {
      const { vendorsCreated, expensesLinked, alreadyLinked } = response.data

      if (vendorsCreated === 0 && expensesLinked === 0) {
        toast.info(t("backfill.noNewVendors"), {
          description: t("backfill.allAssigned"),
        })
      } else if (vendorsCreated > 0) {
        toast.success(t("backfill.created", { count: vendorsCreated }), {
          description: t("backfill.linked", { count: expensesLinked }),
        })
      } else {
        toast.success(t("backfill.linkedOnly", { count: expensesLinked }), {
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
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
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
