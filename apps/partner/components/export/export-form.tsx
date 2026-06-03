"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Label } from "@polso/ui/label"
import { Input } from "@polso/ui/input"
import { DownloadSimple, Spinner } from "@phosphor-icons/react"

function getDefaultDates(range: string): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().split("T")[0]

  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3)
    const from = new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0]
    return { from, to: today }
  }

  if (range === "year") {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]
    return { from, to: today }
  }

  // default: month
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  return { from, to: today }
}

export function ExportForm({
  clientId,
  separator = ";",
  defaultExportRange = "month",
}: {
  clientId: string
  separator?: string
  defaultExportRange?: string
}) {
  const today = new Date().toISOString().split("T")[0]
  const defaults = getDefaultDates(defaultExportRange)

  const router = useRouter()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const params = new URLSearchParams({ clientId, from, to })
    const url = `/api/export?${params}`

    const a = document.createElement("a")
    a.href = url
    a.download = `polso-export-${from}-${to}.zip`
    a.click()

    // Wait for the server to write the export record, then refresh history
    await new Promise((r) => setTimeout(r, 1500))
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="max-w-sm space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Desde</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to}
          />
        </div>
        <div className="space-y-2">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
            max={today}
          />
        </div>
      </div>
      <Button onClick={handleExport} disabled={loading}>
        {loading ? (
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <DownloadSimple className="mr-2 h-4 w-4" />
        )}
        {loading ? "Generando..." : "Descargar CSV"}
      </Button>
    </div>
  )
}
