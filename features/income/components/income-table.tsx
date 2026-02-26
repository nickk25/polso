"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner, X, ListBullets, CheckCircle, Tag } from "@phosphor-icons/react"
import { CategorySelect } from "@/features/categories/components/category-select"
import {
  updateIncomeAction,
  bulkUpdateIncomeCategoryAction,
  bulkUpdateIncomeSourceAction,
  bulkUpdateIncomeStatusAction,
} from "../actions/update-income"
import type { IncomeWithRelations } from "../queries/get-income"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface IncomeTableProps {
  incomes: IncomeWithRelations[]
  categories: CategoryWithCount[]
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="default">{t("statuses.confirmed")}</Badge>
    case "excluded":
      return <Badge variant="secondary">{t("statuses.excluded")}</Badge>
    case "pending":
    default:
      return <Badge variant="outline">{t("statuses.pending")}</Badge>
  }
}

function getSourceBadge(source: string, t: (key: string) => string) {
  const sourceConfig: Record<string, { className: string; label: string }> = {
    salary: { className: "bg-green-500/10 text-green-500 border-green-500/20", label: t("sources.salary") },
    freelance: { className: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: t("sources.freelance") },
    investment: { className: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: t("sources.investment") },
    refund: { className: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: t("sources.refund") },
    transfer: { className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", label: t("sources.transfer") },
    other: { className: "bg-gray-500/10 text-gray-500 border-gray-500/20", label: t("sources.other") },
  }

  const config = sourceConfig[source] || sourceConfig.other
  return <Badge variant="secondary" className={config.className}>{config.label}</Badge>
}

export function IncomeTable({ incomes, categories }: IncomeTableProps) {
  const router = useRouter()
  const t = useTranslations("income")

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Edit sheet state
  const [selectedIncome, setSelectedIncome] = useState<IncomeWithRelations | null>(null)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [editedSource, setEditedSource] = useState<string>("")
  const [editedStatus, setEditedStatus] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === incomes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(incomes.map((i) => i.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const allSelected = incomes.length > 0 && selectedIds.size === incomes.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < incomes.length

  const ids = Array.from(selectedIds)

  // Bulk action handlers
  const handleBulkCategoryChange = async (categoryId: string | null) => {
    setBulkLoading(true)
    const result = await bulkUpdateIncomeCategoryAction(ids, categoryId)
    setBulkLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleBulkSourceChange = async (source: string) => {
    setBulkLoading(true)
    const result = await bulkUpdateIncomeSourceAction(ids, source)
    setBulkLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  const handleBulkStatusChange = async (status: "pending" | "confirmed" | "excluded") => {
    setBulkLoading(true)
    const result = await bulkUpdateIncomeStatusAction(ids, status)
    setBulkLoading(false)
    if (result.success) {
      router.refresh()
    }
  }

  // Edit sheet handlers
  const handleRowClick = (income: IncomeWithRelations) => {
    setSelectedIncome(income)
    setEditedCategoryId(income.category?.id || null)
    setEditedSource(income.source)
    setEditedStatus(income.status)
  }

  const handleSave = async () => {
    if (!selectedIncome) return

    setSaving(true)

    const result = await updateIncomeAction(selectedIncome.id, {
      categoryId: editedCategoryId,
      source: editedSource,
      status: editedStatus as "pending" | "confirmed" | "excluded",
    })

    setSaving(false)

    if (result.success) {
      setSelectedIncome(null)
      router.refresh()
    }
  }

  const hasChanges =
    selectedIncome &&
    (editedCategoryId !== (selectedIncome.category?.id || null) ||
      editedSource !== selectedIncome.source ||
      editedStatus !== selectedIncome.status)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>{t("tableHeaders.date")}</TableHead>
            <TableHead>{t("tableHeaders.description")}</TableHead>
            <TableHead>{t("tableHeaders.category")}</TableHead>
            <TableHead>{t("tableHeaders.source")}</TableHead>
            <TableHead className="text-right">{t("tableHeaders.amount")}</TableHead>
            <TableHead>{t("tableHeaders.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.map((income) => (
            <TableRow
              key={income.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(income)}
              data-state={selectedIds.has(income.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(income.id)}
                  onCheckedChange={() => toggleSelect(income.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select row`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {format(new Date(income.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="max-w-[300px] whitespace-normal">
                <div className="flex flex-col">
                  <span className="font-medium truncate">
                    {income.transaction?.merchantName ||
                      income.transaction?.name ||
                      income.description ||
                      "Unknown"}
                  </span>
                  {income.transaction?.category && (
                    <span className="text-xs text-muted-foreground truncate">
                      {income.transaction.category}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {income.category ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: income.category.color }}
                    />
                    <span>{income.category.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{getSourceBadge(income.source, t)}</TableCell>
              <TableCell className="text-right font-medium text-green-500">
                +{formatCurrency(income.amount, income.currency)}
              </TableCell>
              <TableCell>{getStatusBadge(income.status, t)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
          {bulkLoading && <Spinner className="h-4 w-4 animate-spin" />}

          <span className="text-sm font-medium">
            {t("bulk.selected", { count: selectedIds.size })}
          </span>

          <div className="h-4 w-px bg-border" />

          {/* Category */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>
                <Tag className="h-4 w-4 mr-1" />
                {t("bulk.categorize")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => handleBulkCategoryChange(cat.id)}
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full mr-2"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => handleBulkCategoryChange(null)}>
                <span className="text-muted-foreground">—</span>
                <span className="ml-2 text-muted-foreground">None</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Source */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>
                <ListBullets className="h-4 w-4 mr-1" />
                {t("bulk.setSource")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {(["salary", "freelance", "investment", "refund", "transfer", "other"] as const).map(
                (source) => (
                  <DropdownMenuItem key={source} onClick={() => handleBulkSourceChange(source)}>
                    {t(`sources.${source}`)}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>
                <CheckCircle className="h-4 w-4 mr-1" />
                {t("bulk.setStatus")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => handleBulkStatusChange("pending")}>
                {t("statuses.pending")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("confirmed")}>
                {t("statuses.confirmed")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("excluded")}>
                {t("statuses.excluded")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border" />

          <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkLoading}>
            <X className="h-4 w-4 mr-1" />
            {t("bulk.deselect")}
          </Button>
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={!!selectedIncome} onOpenChange={(open) => !open && setSelectedIncome(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("editSheet.title")}</SheetTitle>
            <SheetDescription>
              {selectedIncome && (
                <>
                  {selectedIncome.transaction?.merchantName ||
                    selectedIncome.transaction?.name ||
                    selectedIncome.description ||
                    "Unknown"}
                  {" • "}
                  +{formatCurrency(selectedIncome.amount, selectedIncome.currency)}
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {selectedIncome && (
            <div className="flex flex-col flex-1 gap-6 p-4">
              <div className="space-y-2">
                <Label>{t("tableHeaders.category")}</Label>
                <CategorySelect
                  value={editedCategoryId}
                  onValueChange={setEditedCategoryId}
                  categories={categories}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("editSheet.source")}</Label>
                <Select value={editedSource} onValueChange={setEditedSource}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">{t("sources.salary")}</SelectItem>
                    <SelectItem value="freelance">{t("sources.freelance")}</SelectItem>
                    <SelectItem value="investment">{t("sources.investment")}</SelectItem>
                    <SelectItem value="refund">{t("sources.refund")}</SelectItem>
                    <SelectItem value="transfer">{t("sources.transfer")}</SelectItem>
                    <SelectItem value="other">{t("sources.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("tableHeaders.status")}</Label>
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
                    <SelectItem value="confirmed">{t("statuses.confirmed")}</SelectItem>
                    <SelectItem value="excluded">{t("statuses.excluded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <SheetFooter className="mt-auto p-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedIncome(null)}
                  disabled={saving}
                >
                  {t("editSheet.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      {t("editSheet.saving")}
                    </>
                  ) : (
                    t("editSheet.saveChanges")
                  )}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
