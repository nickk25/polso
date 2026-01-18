"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillVendorsAction } from "../actions/backfill-vendors"

export function BackfillVendorsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    const response = await backfillVendorsAction()

    setLoading(false)

    if (response.success && response.data) {
      const { vendorsCreated, expensesLinked, alreadyLinked } = response.data

      if (vendorsCreated === 0 && expensesLinked === 0) {
        toast.info("No new vendors to create", {
          description: "All transactions already have vendors assigned.",
        })
      } else if (vendorsCreated > 0) {
        toast.success(`Created ${vendorsCreated} vendor${vendorsCreated > 1 ? "s" : ""}`, {
          description: `${expensesLinked} expense${expensesLinked > 1 ? "s" : ""} linked to vendors.`,
        })
      } else {
        toast.success(`Linked ${expensesLinked} expense${expensesLinked > 1 ? "s" : ""}`, {
          description: "Expenses linked to existing vendors.",
        })
      }

      router.refresh()
    } else {
      toast.error("Failed to create vendors", {
        description: "error" in response ? response.error : "An error occurred.",
      })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <>
          <Spinner className="h-4 w-4 mr-2 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Sparkle weight="fill" className="h-4 w-4 mr-2" />
          Create from transactions
        </>
      )}
    </Button>
  )
}
