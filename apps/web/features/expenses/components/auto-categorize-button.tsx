"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import { Sparkle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillCategoriesAction } from "@/features/intelligence/actions/backfill-categories"

export function AutoCategorizeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations("expenses")

  const handleClick = async () => {
    setLoading(true)

    const response = await backfillCategoriesAction()

    setLoading(false)

    if (response.success && response.data) {
      const { categorized, skipped, total } = response.data

      if (total === 0) {
        toast.info(t("autoCategorize.noUncategorized"), {
          description: t("autoCategorize.noUncategorizedDescription"),
        })
      } else if (categorized > 0) {
        toast.success(t("autoCategorize.categorized", { count: categorized }), {
          description: skipped > 0
            ? t("autoCategorize.categorizedPartialDescription", { count: skipped })
            : t("autoCategorize.categorizedAllDescription"),
        })
      } else {
        toast.warning(t("autoCategorize.noMatches"), {
          description: t("autoCategorize.noMatchesDescription", { count: skipped }),
        })
      }

      router.refresh()
    } else {
      toast.error(t("autoCategorize.failed"), {
        description: "error" in response ? response.error : t("autoCategorize.failedDescription"),
      })
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Spinner className="h-4 w-4 mr-2 animate-spin" />
          {t("autoCategorize.categorizing")}
        </>
      ) : (
        <>
          <Sparkle weight="fill" className="h-4 w-4 mr-2" />
          {t("autoCategorize.button")}
        </>
      )}
    </Button>
  )
}
