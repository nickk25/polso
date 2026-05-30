"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
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
import { type DateRange } from "react-day-picker"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface TransactionFiltersProps {
  search?: string
  type?: string
  status?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  categories: CategoryWithCount[]
}

export function TransactionFilters({
  search,
  type,
  status,
  category,
  dateFrom,
  dateTo,
  categories,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("transactions")

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
        router.push(`/transactions?${params.toString()}`)
      })
    },
    [router, searchParams]
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

  const handleDateSelect = (range: DateRange | undefined) => {
    updateParams({
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push("/transactions")
    })
  }

  const hasFilters = search || type || status || category || dateFrom || dateTo

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("tableFilters.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 w-[200px]"
        />
      </div>

      <DateRangePicker
        from={dateFrom ? new Date(dateFrom) : undefined}
        to={dateTo ? new Date(dateTo) : undefined}
        onSelect={handleDateSelect}
        placeholder={t("tableFilters.dateRange")}
      />

      <Select
        value={type || "all"}
        onValueChange={(value) => updateParams({ type: value })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("tableFilters.allTypes")}</SelectItem>
          <SelectItem value="expense">{t("types.expense")}</SelectItem>
          <SelectItem value="income">{t("types.income")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={category || "all"}
        onValueChange={(value) => updateParams({ category: value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("tableFilters.allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("tableFilters.allCategories")}</SelectItem>
          <SelectItem value="none">{t("tableFilters.noCategory")}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status || "all"}
        onValueChange={(value) => updateParams({ status: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("tableFilters.allStatus")}</SelectItem>
          <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
          <SelectItem value="verified">{t("statuses.verified")}</SelectItem>
          <SelectItem value="excluded">{t("statuses.excluded")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
          <X className="h-4 w-4 mr-1" />
          {t("tableFilters.clear")}
        </Button>
      )}
    </div>
  )
}
