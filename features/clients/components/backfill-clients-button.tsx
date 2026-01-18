"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner, Sparkle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { backfillClientsAction } from "../actions/backfill-clients"

export function BackfillClientsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleBackfill = async () => {
    setLoading(true)

    const result = await backfillClientsAction()

    if (!result.success) {
      toast.error("Failed to create clients", {
        description: result.error,
      })
      setLoading(false)
      return
    }

    const { clientsCreated, incomesLinked, alreadyLinked } = result.data

    if (clientsCreated === 0 && alreadyLinked === 0) {
      toast.info("No clients to create", {
        description: "All income transactions already have clients assigned.",
      })
    } else {
      toast.success("Clients created from transactions", {
        description: `Created ${clientsCreated} new client${clientsCreated !== 1 ? "s" : ""}, linked ${incomesLinked} income${incomesLinked !== 1 ? "s" : ""}.`,
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
