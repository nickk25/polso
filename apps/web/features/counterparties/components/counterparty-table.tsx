"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import { Input } from "@polso/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@polso/ui/tooltip"
import { MagnifyingGlass, Sparkle, GitMerge } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/format-currency"
import type { CounterpartyWithStats } from "../queries/get-counterparties"

interface CounterpartyTableProps {
  counterparties: CounterpartyWithStats[]
  currency: string
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onRowClick: (counterparty: CounterpartyWithStats) => void
  onMergeClick: () => void
}

export function CounterpartyTable({
  counterparties,
  currency,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onMergeClick,
}: CounterpartyTableProps) {
  const t = useTranslations("counterparties")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.length > 0) onSelectionChange([])
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds.length, onSelectionChange])

  const filtered = counterparties.filter((cp) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      cp.name.toLowerCase().includes(q) ||
      cp.normalizedName.toLowerCase().includes(q) ||
      cp.defaultCategory?.name.toLowerCase().includes(q)
    )
  })

  const allSelected = filtered.length > 0 && filtered.every((cp) => selectedIds.includes(cp.id))
  const someSelected = filtered.some((cp) => selectedIds.includes(cp.id)) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? filtered.map((cp) => cp.id) : [])
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    onSelectionChange(checked ? [...selectedIds, id] : selectedIds.filter((s) => s !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("table.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedIds.length >= 2 && (
          <Button variant="outline" size="sm" onClick={onMergeClick}>
            <GitMerge className="h-4 w-4 mr-2" />
            {t("table.mergeSelected", { count: selectedIds.length })}
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>{t("table.vendor")}</TableHead>
              <TableHead>{t("table.defaultCategory")}</TableHead>
              <TableHead className="text-right">{t("table.expenses")}</TableHead>
              <TableHead className="text-right">{t("table.totalSpent")}</TableHead>
              <TableHead>{t("table.lastExpense")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search ? t("table.noMatch") : t("table.noVendors")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cp) => (
                <TableRow
                  key={cp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(cp)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(cp.id)}
                      onCheckedChange={(checked) => handleSelectOne(cp.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{cp.name}</span>
                      {cp.isAutoDetected && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Sparkle weight="fill" className="h-3 w-3 text-violet-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("table.autoDetected")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cp.defaultCategory ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cp.defaultCategory.color }} />
                        <span>{cp.defaultCategory.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{cp._count.entries}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(cp.totalSpent, currency)}
                  </TableCell>
                  <TableCell>
                    {cp.lastEntryDate ? (
                      format(new Date(cp.lastEntryDate), "MMM d, yyyy")
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
