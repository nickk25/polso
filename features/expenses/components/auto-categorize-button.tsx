"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillCategoriesAction } from "@/features/intelligence/actions/backfill-categories"

export function AutoCategorizeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    const response = await backfillCategoriesAction()

    setLoading(false)

    if (response.success && response.data) {
      const { categorized, skipped, total } = response.data

      if (total === 0) {
        toast.info("No uncategorized expenses", {
          description: "All expenses already have categories assigned.",
        })
      } else if (categorized > 0) {
        toast.success(`Categorized ${categorized} expenses`, {
          description: skipped > 0
            ? `${skipped} expenses couldn't be matched automatically.`
            : "All uncategorized expenses have been assigned categories.",
        })
      } else {
        toast.warning("No matches found", {
          description: `${skipped} expenses couldn't be matched. Try adding more keyword rules or vendor defaults.`,
        })
      }

      router.refresh()
    } else {
      toast.error("Failed to categorize", {
        description: "error" in response ? response.error : "An error occurred while categorizing expenses.",
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
          Categorizing...
        </>
      ) : (
        <>
          <Sparkle weight="fill" className="h-4 w-4 mr-2" />
          Auto-categorize
        </>
      )}
    </Button>
  )
}
