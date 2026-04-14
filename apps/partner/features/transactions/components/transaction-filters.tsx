"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useTransition } from "react"
import { format } from "date-fns"
import { Input } from "@polso/ui/input"
import { Button } from "@polso/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { DateRangePicker } from "@polso/ui/date-range-picker"
import { MagnifyingGlass, X } from "@phosphor-icons/react"

interface TransactionFiltersProps {
  clientId: string
  search?: string
  receiptStatus?: string
  dateFrom?: string
  dateTo?: string
}

export function TransactionFilters({
  clientId,
  search,
  receiptStatus,
  dateFrom,
  dateTo,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const basePath = `/clients/${clientId}/transactions`

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      params.delete("page")
      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`)
      })
    },
    [router, searchParams, basePath]
  )

  const [searchValue, setSearchValue] = useState(search || "")

  useEffect(() => {
    setSearchValue(search || "")
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search || "")) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    updateParams({
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push(basePath)
    })
  }

  const hasFilters = search || receiptStatus || dateFrom || dateTo
  const fromDate = dateFrom ? new Date(dateFrom) : undefined
  const toDate = dateTo ? new Date(dateTo) : undefined

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar transacción..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <DateRangePicker
          from={fromDate}
          to={toDate}
          onSelect={handleDateSelect}
          placeholder="Rango de fechas"
          className="w-full sm:w-auto"
        />

        <Select
          value={receiptStatus || "all"}
          onValueChange={(value) => updateParams({ receiptStatus: value })}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Comprobantes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="con_recibo">Con comprobante</SelectItem>
            <SelectItem value="sin_recibo">Sin comprobante</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
