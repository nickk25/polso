"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Spinner, ArrowsClockwise } from "@phosphor-icons/react"
import { runMatchingAction } from "@/features/matching/actions/run-matching"
import { toast } from "@polso/ui/sonner"

interface RunMatchingButtonProps {
  clientId: string
}

export function RunMatchingButton({ clientId }: RunMatchingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    const result = await runMatchingAction(clientId)
    setLoading(false)

    if (result.success) {
      const { created, skipped } = result.data
      if (created === 0) {
        toast.info("Sin nuevas sugerencias", {
          description: "No se encontraron pares con suficiente confianza.",
        })
      } else {
        toast.success(`${created} sugerencia${created !== 1 ? "s" : ""} generada${created !== 1 ? "s" : ""}`, {
          description: skipped > 0 ? `${skipped} par${skipped !== 1 ? "es" : ""} ya existían.` : undefined,
        })
        router.refresh()
      }
    } else {
      toast.error("Error al ejecutar matching", { description: result.error })
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleRun} disabled={loading}>
      {loading ? (
        <Spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ArrowsClockwise className="mr-2 h-4 w-4" />
      )}
      {loading ? "Ejecutando..." : "Ejecutar matching"}
    </Button>
  )
}
