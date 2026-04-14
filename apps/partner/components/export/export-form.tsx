"use client"

import { useState } from "react"
import { Button } from "@polso/ui/button"
import { Label } from "@polso/ui/label"
import { Input } from "@polso/ui/input"
import { DownloadSimple } from "@phosphor-icons/react"

export function ExportForm({
  clientId,
  separator = ";",
}: {
  clientId: string
  separator?: string
}) {
  const today = new Date().toISOString().split("T")[0]
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0]

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(false)

  function handleExport() {
    setLoading(true)
    const params = new URLSearchParams({ clientId, from, to })
    const url = `/api/export?${params}`

    const a = document.createElement("a")
    a.href = url
    a.download = `polso-export-${from}-${to}.csv`
    a.click()
    setTimeout(() => setLoading(false), 1500)
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
        <DownloadSimple className="mr-2 h-4 w-4" />
        {loading ? "Generando..." : "Descargar CSV"}
      </Button>
    </div>
  )
}
