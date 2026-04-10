"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { X } from "@phosphor-icons/react"

interface AlertFiltersProps {
  type?: string
  severity?: string
  status?: string
}

export function AlertFilters({ type, severity, status }: AlertFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("alerts")

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
        router.push(`/alerts?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const clearFilters = () => {
    startTransition(() => {
      router.push("/alerts")
    })
  }

  const hasFilters = type || severity || status

  return (
    <div className="flex gap-2 flex-wrap">
      <Select
        value={type || "all"}
        onValueChange={(value) => updateParams({ type: value })}
      >
        <SelectTrigger className="w-[160px]" disabled={isPending}>
          <SelectValue placeholder={t("filters.typePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
          <SelectItem value="low_balance">{t("types.low_balance")}</SelectItem>
          <SelectItem value="high_expense">{t("types.high_expense")}</SelectItem>
          <SelectItem value="runway_warning">{t("types.runway_warning")}</SelectItem>
          <SelectItem value="unusual_activity">{t("types.unusual_activity")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={severity || "all"}
        onValueChange={(value) => updateParams({ severity: value })}
      >
        <SelectTrigger className="w-[150px]" disabled={isPending}>
          <SelectValue placeholder={t("filters.severityPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allSeverities")}</SelectItem>
          <SelectItem value="critical">{t("severity.critical")}</SelectItem>
          <SelectItem value="warning">{t("severity.warning")}</SelectItem>
          <SelectItem value="info">{t("severity.info")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={status || "all"}
        onValueChange={(value) => updateParams({ status: value })}
      >
        <SelectTrigger className="w-[130px]" disabled={isPending}>
          <SelectValue placeholder={t("filters.statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("status.all")}</SelectItem>
          <SelectItem value="unread">{t("status.unread")}</SelectItem>
          <SelectItem value="read">{t("status.read")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters} disabled={isPending}>
          <X className="h-4 w-4 mr-1" />
          {t("filters.clear")}
        </Button>
      )}
    </div>
  )
}
