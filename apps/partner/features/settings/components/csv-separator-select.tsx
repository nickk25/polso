"use client"

import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { updateCsvSeparatorAction } from "../actions/update-csv-separator"
import { toast } from "sonner"

export function CsvSeparatorSelect({ value }: { value: string }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(sep: string) {
    startTransition(async () => {
      const result = await updateCsvSeparatorAction(sep)
      if (result.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(result.error ?? "Error al guardar")
      }
    })
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value=";">Punto y coma (;)</SelectItem>
        <SelectItem value=",">Coma (,)</SelectItem>
        <SelectItem value={"\t"}>Tabulador</SelectItem>
      </SelectContent>
    </Select>
  )
}
