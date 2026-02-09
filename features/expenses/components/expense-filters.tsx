"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MagnifyingGlass, X } from "@phosphor-icons/react"

interface ExpenseFiltersProps {
  search?: string
  status?: string
  expenseType?: string
}

export function ExpenseFilters({ search, status, expenseType }: ExpenseFiltersProps) {
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const searchValue = formData.get("search") as string
    updateParams({ search: searchValue })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push("/expenses")
    })
  }

  const hasFilters = search || status || expenseType

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder={t("tableFilters.searchPlaceholder")}
            defaultValue={search}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="icon" disabled={isPending}>
          <MagnifyingGlass className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex gap-2 flex-wrap">
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
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            {t("tableFilters.clear")}
          </Button>
        )}
      </div>
    </div>
  )
}
