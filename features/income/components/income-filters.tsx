"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
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

interface IncomeFiltersProps {
  search?: string
  status?: string
  source?: string
}

export function IncomeFilters({ search, status, source }: IncomeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

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
        router.push(`/income?${params.toString()}`)
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
      router.push("/income")
    })
  }

  const hasFilters = search || status || source

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search income..."
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="excluded">Excluded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={source || "all"}
          onValueChange={(value) => updateParams({ source: value })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="salary">Salary</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
