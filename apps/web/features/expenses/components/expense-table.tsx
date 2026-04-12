"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import { Label } from "@polso/ui/label"
import { Separator } from "@polso/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@polso/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Spinner, Sparkle, Receipt, TelegramLogo, WhatsappLogo, DownloadSimple, Eye } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@polso/ui/tooltip"
import { CategorySelect } from "@/features/categories/components/category-select"
import { ExpenseBulkActionBar } from "./expense-bulk-action-bar"
import { updateExpenseAction } from "../actions/update-expense"
import { getExpenseInvoicesAction, type InvoiceWithUrl, type InboxItemWithUrl } from "../actions/invoice-actions"
import { InvoiceUpload } from "./invoice-upload"
import { InvoiceList } from "./invoice-list"
import type { ExpenseWithRelations } from "../queries/get-expenses"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"

interface ExpenseTableProps {
  expenses: ExpenseWithRelations[]
  categories: CategoryWithCount[]
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

export function ExpenseTable({ expenses, categories }: ExpenseTableProps) {
  const router = useRouter()
  const t = useTranslations("expenses")
  const tc = useTranslations("common")
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [editedExpenseType, setEditedExpenseType] = useState<string>("")
  const [editedStatus, setEditedStatus] = useState<string>("")
  const [invoices, setInvoices] = useState<InvoiceWithUrl[]>([])
  const [inboxItems, setInboxItems] = useState<InboxItemWithUrl[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedIndex = useRef<number | null>(null)
  const shiftHeld = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds.size])

  const toggleSelect = (id: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(lastClickedIndex.current, index)
      const end = Math.max(lastClickedIndex.current, index)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          next.add(expenses[i].id)
        }
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
    lastClickedIndex.current = index
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)))
    }
  }

  const allSelected = expenses.length > 0 && selectedIds.size === expenses.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < expenses.length

  // Load invoices and inbox items when expense is selected
  useEffect(() => {
    if (selectedExpense) {
      setInvoicesLoading(true)
      getExpenseInvoicesAction(selectedExpense.id)
        .then((result) => {
          if (result.success) {
            setInvoices(result.data.invoices)
            setInboxItems(result.data.inboxItems)
          }
        })
        .finally(() => setInvoicesLoading(false))
    } else {
      setInvoices([])
      setInboxItems([])
    }
  }, [selectedExpense?.id])

  const handleRowClick = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense)
    setEditedCategoryId(expense.category?.id || null)
    setEditedExpenseType(expense.expenseType)
    setEditedStatus(expense.status)
  }

  const handleInvoiceUploadComplete = (invoice: InvoiceWithUrl) => {
    setInvoices((prev) => [invoice, ...prev])
    // Status is automatically set to "documented" on the server
    setEditedStatus("documented")
    router.refresh()
  }

  const handleInvoiceDelete = (invoiceId: string) => {
    const newInvoices = invoices.filter((inv) => inv.id !== invoiceId)
    setInvoices(newInvoices)
    // If no invoices remain and no inbox items, status is set to "pending" on the server
    if (newInvoices.length === 0 && inboxItems.length === 0) {
      setEditedStatus("pending")
    }
    router.refresh()
  }

  const handleSave = async () => {
    if (!selectedExpense) return

    setLoading(true)

    const result = await updateExpenseAction(selectedExpense.id, {
      categoryId: editedCategoryId,
      expenseType: editedExpenseType as "fixed" | "variable",
      status: editedStatus as "pending" | "documented" | "excluded",
    })

    setLoading(false)

    if (result.success) {
      setSelectedExpense(null)
      router.refresh()
    }
  }

  const hasChanges =
    selectedExpense &&
    (editedCategoryId !== (selectedExpense.category?.id || null) ||
      editedExpenseType !== selectedExpense.expenseType ||
      editedStatus !== selectedExpense.status)

  const getStatusBadge = (expense: ExpenseWithRelations) => {
    switch (expense.status) {
      case "documented":
        return <Badge variant="default">{t("table.statusDocumented")}</Badge>
      case "excluded":
        return <Badge variant="secondary">{t("table.statusExcluded")}</Badge>
      default:
        return <Badge variant="outline">{t("table.statusPending")}</Badge>
    }
  }

  const getExpenseTypeBadge = (type: string) => {
    switch (type) {
      case "fixed":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500/10 text-red-500 border-red-500/20"
          >
            {t("fixed")}
          </Badge>
        )
      case "variable":
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-500 border-amber-500/20"
          >
            {t("variable")}
          </Badge>
        )
    }
  }

  const formatCategorySource = (source: string | null): string => {
    switch (source) {
      case "vendor":
        return t("table.categorySourceVendor")
      case "provider":
        return t("table.categorySourceProvider")
      case "keyword":
        return t("table.categorySourceKeyword")
      case "manual":
        return t("table.categorySourceManual")
      default:
        return t("table.unknown")
    }
  }

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
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.description")}</TableHead>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.type")}</TableHead>
            <TableHead className="text-right">{t("table.amount")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense, index) => (
            <TableRow
              key={expense.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(expense)}
              data-state={selectedIds.has(expense.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(expense.id)}
                  onCheckedChange={() => toggleSelect(expense.id, index, shiftHeld.current)}
                  onClick={(e) => {
                    e.stopPropagation()
                    shiftHeld.current = e.shiftKey
                  }}
                  aria-label={`Select row`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {format(new Date(expense.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="max-w-[300px] whitespace-normal">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">
                    {expense.vendor?.name ||
                      expense.transaction?.merchantName ||
                      expense.transaction?.name ||
                      expense.description ||
                      t("table.unknown")}
                  </span>
                  {expense.transaction?.category && (
                    <span className="text-xs text-muted-foreground truncate">
                      {expense.transaction.category}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {expense.category ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: expense.category.color }}
                    />
                    <span>{expense.category.name}</span>
                    {expense.categorySource && expense.categorySource !== "manual" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkle
                            weight="fill"
                            className="h-3 w-3 text-violet-500"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{t("table.autoCategorized")}</p>
                          <p className="text-muted-foreground">
                            {formatCategorySource(expense.categorySource)}
                            {expense.categoryConfidence && (
                              <> • {t("table.confidence", { percent: Math.round(expense.categoryConfidence * 100) })}</>
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{getExpenseTypeBadge(expense.expenseType)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(expense.amount, expense.currency)}
              </TableCell>
              <TableCell>{getStatusBadge(expense)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedIds.size > 0 && (
        <ExpenseBulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          categories={categories}
          selectedTotal={expenses
            .filter((e) => selectedIds.has(e.id))
            .reduce((sum, e) => sum + e.amount, 0)}
          currency={expenses[0]?.currency}
        />
      )}

      <Sheet open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("table.editTitle")}</SheetTitle>
            <SheetDescription>
              {selectedExpense && (
                <>
                  {selectedExpense.vendor?.name ||
                    selectedExpense.transaction?.merchantName ||
                    selectedExpense.transaction?.name ||
                    selectedExpense.description ||
                    t("table.unknown")}
                  {" • "}
                  {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {selectedExpense && (
            <div className="flex flex-col flex-1 gap-6 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{t("table.category")}</Label>
                  {selectedExpense.categorySource && selectedExpense.categorySource !== "manual" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                          <Sparkle weight="fill" className="h-3 w-3" />
                          {t("table.auto")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{t("table.autoCategorized")}</p>
                        <p className="text-muted-foreground">
                          {formatCategorySource(selectedExpense.categorySource)}
                          {selectedExpense.categoryConfidence && (
                            <> • {t("table.confidence", { percent: Math.round(selectedExpense.categoryConfidence * 100) })}</>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <CategorySelect
                  value={editedCategoryId}
                  onValueChange={setEditedCategoryId}
                  categories={categories}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("table.expenseType")}</Label>
                <Select value={editedExpenseType} onValueChange={setEditedExpenseType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {t("fixed")}
                      </span>
                    </SelectItem>
                    <SelectItem value="variable">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        {t("variable")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("table.status")}</Label>
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("table.statusPending")}</SelectItem>
                    <SelectItem value="documented">{t("table.statusDocumented")}</SelectItem>
                    <SelectItem value="excluded">{t("table.statusExcluded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Invoices & Receipts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <Label>{t("table.invoicesAndReceipts")}</Label>
                  </div>
                  {(invoices.length + inboxItems.length) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {invoices.length + inboxItems.length}
                    </Badge>
                  )}
                </div>

                <InvoiceList
                  invoices={invoices}
                  onDelete={handleInvoiceDelete}
                  loading={invoicesLoading}
                />

                {/* Inbox items from Telegram/WhatsApp */}
                {inboxItems.length > 0 && (
                  <div className="space-y-2">
                    {inboxItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.source === "telegram" ? (
                            <TelegramLogo className="h-4 w-4 text-sky-500 shrink-0" />
                          ) : (
                            <WhatsappLogo className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.fileName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {item.source}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title={t("invoices.preview")}
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <a
                            href={item.downloadUrl}
                            download={item.fileName}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title={t("invoices.download")}
                          >
                            <DownloadSimple className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <InvoiceUpload
                  expenseId={selectedExpense.id}
                  onUploadComplete={handleInvoiceUploadComplete}
                  disabled={loading}
                />
              </div>

              <SheetFooter className="mt-auto p-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedExpense(null)}
                  disabled={loading}
                >
                  {tc("actions.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={loading || !hasChanges}>
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      {tc("actions.saving")}
                    </>
                  ) : (
                    tc("actions.saveChanges")
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
