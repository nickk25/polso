"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { format, subMonths, startOfMonth } from "date-fns"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"

interface AnalyticsFiltersProps {
  selectedMonth: string // yyyy-MM
}

function buildMonthOptions(count = 13) {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const date = startOfMonth(subMonths(now, i))
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    })
  }
  return options
}

export function AnalyticsFilters({ selectedMonth }: AnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const t = useTranslations("analytics")

  const currentMonth = format(new Date(), "yyyy-MM")
  const monthOptions = buildMonthOptions(13)

  const navigate = (month: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (month === currentMonth) {
      params.delete("month")
    } else {
      params.set("month", month)
    }
    startTransition(() => {
      router.push(`/analytics?${params.toString()}`)
    })
  }

  const handlePrevious = () => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const prev = startOfMonth(new Date(year, month - 2))
    navigate(format(prev, "yyyy-MM"))
  }

  const handleNext = () => {
    if (selectedMonth >= currentMonth) return
    const [year, month] = selectedMonth.split("-").map(Number)
    const next = startOfMonth(new Date(year, month))
    navigate(format(next, "yyyy-MM"))
  }

  const isCurrentMonth = selectedMonth === currentMonth

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePrevious} aria-label={t("filters.previousMonth")}>
        <CaretLeft className="h-4 w-4" />
      </Button>

      <Select value={selectedMonth} onValueChange={navigate}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === currentMonth && (
                <span className="ml-2 text-xs text-muted-foreground">{t("filters.current")}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={isCurrentMonth}
        aria-label={t("filters.nextMonth")}
      >
        <CaretRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
