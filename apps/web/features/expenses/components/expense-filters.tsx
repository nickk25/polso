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

interface ExpenseFiltersProps {
  search?: string
  status?: string
  expenseType?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  categories: CategoryWithCount[]
}

export function ExpenseFilters({ search, status, expenseType, category, dateFrom, dateTo, categories }: ExpenseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("expenses")

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

      // Reset to page 1 when filters change
      params.delete("page")

      startTransition(() => {
        router.push(`/expenses?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const [searchValue, setSearchValue] = useState(search || "")

  // Sync external prop changes (browser back/forward)
  useEffect(() => {
    setSearchValue(search || "")
  }, [search])

  // Debounced search
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
      router.push("/expenses")
    })
  }

  const hasFilters = search || status || expenseType || category || dateFrom || dateTo

  const fromDate = dateFrom ? new Date(dateFrom) : undefined
  const toDate = dateTo ? new Date(dateTo) : undefined

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("tableFilters.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <DateRangePicker
          from={fromDate}
          to={toDate}
          onSelect={handleDateSelect}
          placeholder={t("tableFilters.dateRange")}
        />

        <Select
          value={category || "all"}
          onValueChange={(value) => updateParams({ category: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("tableFilters.categoryPlaceholder")} />
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
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("tableFilters.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tableFilters.allStatus")}</SelectItem>
            <SelectItem value="pending">{t("tableFilters.pending")}</SelectItem>
            <SelectItem value="documented">{t("tableFilters.documented")}</SelectItem>
            <SelectItem value="excluded">{t("tableFilters.excluded")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={expenseType || "all"}
          onValueChange={(value) => updateParams({ expenseType: value })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("tableFilters.typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tableFilters.allTypes")}</SelectItem>
            <SelectItem value="fixed">{t("tableFilters.fixed")}</SelectItem>
            <SelectItem value="variable">{t("tableFilters.variable")}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            {t("tableFilters.clear")}
          </Button>
        )}
      </div>
    </div>
  )
}
