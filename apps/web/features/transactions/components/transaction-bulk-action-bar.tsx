"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@polso/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import { Spinner, X, Tag, ListBullets, CheckCircle } from "@phosphor-icons/react"
import {
  bulkUpdateEntryCategoryAction,
  bulkUpdateEntryTypeAction,
  bulkUpdateEntryStatusAction,
} from "@/features/transactions/actions/bulk-update-transaction"
import type { TransactionRow } from "@/features/transactions/queries/get-transactions"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface TransactionBulkActionBarProps {
  selectedRows: TransactionRow[]
  onClearSelection: () => void
  categories: CategoryWithCount[]
}

export function TransactionBulkActionBar({
  selectedRows,
  onClearSelection,
  categories,
}: TransactionBulkActionBarProps) {
  const router = useRouter()
  const t = useTranslations("transactions")
  const [loading, setLoading] = useState(false)

  const expenseRows = selectedRows.filter((r) => r.direction === "expense")
  const incomeRows = selectedRows.filter((r) => r.direction === "income")
  const allIds = selectedRows.map((r) => r.id)
  const count = selectedRows.length
  const hasExpenses = expenseRows.length > 0
  const hasIncome = incomeRows.length > 0
  const mixedSelection = hasExpenses && hasIncome

  const expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0)
  const incomeTotal = incomeRows.reduce((s, r) => s + r.amount, 0)
  const expenseCurrency = expenseRows[0]?.currency
  const incomeCurrency = incomeRows[0]?.currency

  const run = async (fn: () => Promise<unknown>) => {
    setLoading(true)
    await fn()
    setLoading(false)
    router.refresh()
  }

  const handleCategoryChange = (categoryId: string | null) =>
    run(() => bulkUpdateEntryCategoryAction(allIds, categoryId))

  const handleTypeChange = (entryType: "fixed" | "variable") =>
    run(() => bulkUpdateEntryTypeAction(allIds, entryType))

  const handleStatusChange = (status: "pending" | "verified" | "excluded") =>
    run(() => bulkUpdateEntryStatusAction(allIds, status))

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
      {loading && <Spinner className="h-4 w-4 animate-spin" />}

      {mixedSelection ? (
        <>
          <span className="text-sm text-muted-foreground">
            {t("bulk.expenses", { count: expenseRows.length })}
          </span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">
            {t("bulk.incomes", { count: incomeRows.length })}
          </span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{t("bulk.selected", { count })}</span>
          {hasExpenses && (
            <span className="text-sm text-muted-foreground">-{formatCurrency(expenseTotal, expenseCurrency)}</span>
          )}
          {hasIncome && (
            <span className="text-sm text-green-500">+{formatCurrency(incomeTotal, incomeCurrency)}</span>
          )}
        </>
      )}

      <div className="h-4 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <Tag className="h-4 w-4 mr-1" />
            {t("bulk.categorize")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
          {categories.map((cat) => (
            <DropdownMenuItem key={cat.id} onClick={() => handleCategoryChange(cat.id)}>
              <div className="h-2 w-2 shrink-0 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => handleCategoryChange(null)}>
            <span className="text-muted-foreground mr-2">—</span>
            <span className="text-muted-foreground">None</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            {t("expenseTypes.fixed")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange("variable")}>
            <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
            {t("expenseTypes.variable")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-1" />
            {t("bulk.setStatus")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => handleStatusChange("pending")}>{t("statuses.pending")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("verified")}>{t("statuses.verified")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("excluded")}>{t("statuses.excluded")}</DropdownMenuItem>
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
