"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Label } from "@polso/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { updateRegionalSettingsAction } from "../actions/update-regional-settings"

const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dólar USD ($)" },
  { value: "GBP", label: "Libra (£)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
]

const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "dd/MM/yyyy" },
  { value: "MM/dd/yyyy", label: "MM/dd/yyyy" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd" },
]

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface Props {
  currency: string
  fiscalYearStart: number
  dateFormat: string
}

export function RegionalSettingsSection({ currency: c, fiscalYearStart: fy, dateFormat: df }: Props) {
  const [values, setValues] = useState({ currency: c, fiscalYearStart: fy, dateFormat: df })
  const [isPending, startTransition] = useTransition()

  function save(field: keyof typeof values, value: string | number) {
    const updated = { ...values, [field]: value }
    setValues(updated)
    startTransition(async () => {
      const res = await updateRegionalSettingsAction({
        currency: updated.currency,
        fiscalYearStart: updated.fiscalYearStart,
        dateFormat: updated.dateFormat,
      })
      if (res.success) {
        toast.success("Preferencia guardada")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Moneda</Label>
        <Select value={values.currency} onValueChange={(v) => save("currency", v)} disabled={isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Inicio del año fiscal</Label>
        <Select value={String(values.fiscalYearStart)} onValueChange={(v) => save("fiscalYearStart", parseInt(v, 10))} disabled={isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Formato de fecha</Label>
        <Select value={values.dateFormat} onValueChange={(v) => save("dateFormat", v)} disabled={isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
