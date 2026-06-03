"use client"

import { useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { updateCsvSeparatorAction } from "../actions/update-csv-separator"
import { updateExportDefaultsAction } from "../actions/update-export-defaults"

interface Props {
  csvSeparator: string
  defaultExportRange: string
}

export function ExportDefaultsSection({ csvSeparator, defaultExportRange }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSeparator(sep: string) {
    startTransition(async () => {
      const res = await updateCsvSeparatorAction(sep)
      if (res.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  function handleRange(range: string) {
    startTransition(async () => {
      const res = await updateExportDefaultsAction(range as "month" | "quarter" | "year")
      if (res.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Separador CSV</Label>
        <Select value={csvSeparator} onValueChange={handleSeparator} disabled={isPending}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=";">Punto y coma (;)</SelectItem>
            <SelectItem value=",">Coma (,)</SelectItem>
            <SelectItem value={"\t"}>Tabulador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rango de fechas por defecto</Label>
        <Select value={defaultExportRange} onValueChange={handleRange} disabled={isPending}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mes actual</SelectItem>
            <SelectItem value="quarter">Trimestre actual</SelectItem>
            <SelectItem value="year">Año actual</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
