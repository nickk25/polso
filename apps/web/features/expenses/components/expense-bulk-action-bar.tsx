"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner, X, Tag, ListBullets, CheckCircle } from "@phosphor-icons/react"
import { CategorySelect } from "@/features/categories/components/category-select"
import {
  bulkUpdateExpenseCategoryAction,
  bulkUpdateExpenseTypeAction,
  bulkUpdateExpenseStatusAction,
} from "../actions/update-expense"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface ExpenseBulkActionBarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
  categories: CategoryWithCount[]
  selectedTotal: number
  currency?: string
}

export function ExpenseBulkActionBar({
  selectedIds,
  onClearSelection,
  categories,
  selectedTotal,
  currency = "USD",
}: ExpenseBulkActionBarProps) {
  const router = useRouter()
  const t = useTranslations("expenses")
  const [loading, setLoading] = useState(false)

  const ids = Array.from(selectedIds)
  const count = ids.length

  const handleCategoryChange = async (categoryId: string | null) => {
    setLoading(true)
    const result = await bulkUpdateExpenseCategoryAction(ids, categoryId)
    setLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleTypeChange = async (expenseType: "fixed" | "variable") => {
    setLoading(true)
    const result = await bulkUpdateExpenseTypeAction(ids, expenseType)
    setLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleStatusChange = async (status: "pending" | "documented" | "excluded") => {
    setLoading(true)
    const result = await bulkUpdateExpenseStatusAction(ids, status)
    setLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
      {loading && <Spinner className="h-4 w-4 animate-spin" />}

      <span className="text-sm font-medium">
        {t("bulk.selected", { count })}
      </span>

      <span className="text-sm text-muted-foreground">
        {formatCurrency(selectedTotal, currency)}
      </span>

      <div className="h-4 w-px bg-border" />

      {/* Category */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <Tag className="h-4 w-4 mr-1" />
            {t("bulk.categorize")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
          {categories.map((cat) => (
            <DropdownMenuItem
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full mr-2"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => handleCategoryChange(null)}>
            <span className="text-muted-foreground">—</span>
            <span className="ml-2 text-muted-foreground">None</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <ListBullets className="h-4 w-4 mr-1" />
            {t("bulk.setType")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => handleTypeChange("fixed")}>
            <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
            {t("fixed")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange("variable")}>
            <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
            {t("variable")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-1" />
            {t("bulk.setStatus")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
            {t("table.statusPending")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("documented")}>
            {t("table.statusDocumented")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("excluded")}>
            {t("table.statusExcluded")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border" />

      <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={loading}>
        <X className="h-4 w-4 mr-1" />
        {t("bulk.deselect")}
      </Button>
    </div>
  )
}
