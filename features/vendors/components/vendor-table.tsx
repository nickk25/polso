"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MagnifyingGlass, Sparkle, GitMerge } from "@phosphor-icons/react"
import type { VendorWithStats } from "../queries/get-vendors"

interface VendorTableProps {
  vendors: VendorWithStats[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onVendorClick: (vendor: VendorWithStats) => void
  onMergeClick: () => void
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function VendorTable({
  vendors,
  selectedIds,
  onSelectionChange,
  onVendorClick,
  onMergeClick,
}: VendorTableProps) {
  const t = useTranslations("vendors")
  const [search, setSearch] = useState("")

  // Filter vendors by search
  const filteredVendors = vendors.filter((vendor) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      vendor.name.toLowerCase().includes(searchLower) ||
      vendor.normalizedName.toLowerCase().includes(searchLower) ||
      vendor.defaultCategory?.name.toLowerCase().includes(searchLower)
    )
  })

  const allSelected =
    filteredVendors.length > 0 &&
    filteredVendors.every((v) => selectedIds.includes(v.id))

  const someSelected =
    filteredVendors.some((v) => selectedIds.includes(v.id)) && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredVendors.map((v) => v.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (vendorId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, vendorId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== vendorId))
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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

      {/* Table */}
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
          {filteredVendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {search ? t("table.noMatch") : t("table.noVendors")}
              </TableCell>
            </TableRow>
          ) : (
            filteredVendors.map((vendor) => (
              <TableRow
                key={vendor.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onVendorClick(vendor)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(vendor.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(vendor.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vendor.name}</span>
                    {vendor.isAutoDetected && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkle
                            weight="fill"
                            className="h-3 w-3 text-violet-500"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("table.autoDetected")}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {vendor.defaultCategory ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: vendor.defaultCategory.color }}
                      />
                      <span>{vendor.defaultCategory.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {vendor._count.expenses}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(vendor.totalSpent)}
                </TableCell>
                <TableCell>
                  {vendor.lastExpenseDate ? (
                    format(new Date(vendor.lastExpenseDate), "MMM d, yyyy")
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
  )
}
