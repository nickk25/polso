"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import { Label } from "@polso/ui/label"
import { Separator } from "@polso/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@polso/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Spinner, Receipt } from "@phosphor-icons/react"
import { Input } from "@polso/ui/input"
import { formatCurrency } from "@/lib/format-currency"
import { calculateTaxFromGross } from "@polso/utils"

// Common EU VAT rates shown as quick-select presets (percent, not decimal)
const EU_VAT_PRESETS = [0, 4, 7, 10, 13, 19, 20, 21, 23] as const
import type { TransactionRow } from "@/features/transactions/queries/get-transactions"
import type { CategoryWithCount } from "@/features/categories/queries/get-categories"
import { CategorySelect } from "@/features/categories/components/category-select"
import { updateEntryAction } from "@/features/transactions/actions/update-transaction"
import {
  getTransactionDocumentsAction,
  type TransactionDocumentWithUrl,
} from "@/features/transactions/actions/document-actions"
import { TransactionDocumentUpload } from "./transaction-document-upload"
import { TransactionDocumentList } from "./transaction-document-list"
import { TransactionBulkActionBar } from "./transaction-bulk-action-bar"

interface TransactionTableProps {
  transactions: TransactionRow[]
  total: number
  pages: number
  page: number
  categories: CategoryWithCount[]
}

export function TransactionTable({
  transactions,
  total,
  pages,
  page,
  categories,
}: TransactionTableProps) {
  const t = useTranslations("transactions")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedIndex = useRef<number | null>(null)
  const shiftHeld = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) setSelectedIds(new Set())
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
        for (let i = start; i <= end; i++) next.add(transactions[i].id)
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
    if (selectedIds.size === transactions.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(transactions.map((t) => t.id)))
  }

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < transactions.length
  const selectedRows = transactions.filter((t) => selectedIds.has(t.id))

  const [selected, setSelected] = useState<TransactionRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [editedEntryType, setEditedEntryType] = useState<string>("")
  const [editedStatus, setEditedStatus] = useState<string>("")
  const [editedTaxRate, setEditedTaxRate] = useState<string>("")
  const [editedTaxAmount, setEditedTaxAmount] = useState<string>("")
  const [documents, setDocuments] = useState<TransactionDocumentWithUrl[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)

  useEffect(() => {
    if (selected?.transactionId) {
      setDocumentsLoading(true)
      getTransactionDocumentsAction(selected.transactionId)
        .then((result) => {
          if (result.success) setDocuments(result.data.documents)
        })
        .finally(() => setDocumentsLoading(false))
    } else {
      setDocuments([])
    }
  }, [selected?.id, selected?.transactionId])

  const handleRowClick = (tx: TransactionRow) => {
    setSelected(tx)
    setEditedCategoryId(tx.category?.id ?? null)
    setEditedEntryType(tx.entryType ?? "variable")
    setEditedStatus(tx.status)
    // taxRate stored as percent string ("21") for display; DB stores decimal (0.21)
    setEditedTaxRate(tx.taxRate != null ? String(Math.round(tx.taxRate * 1000) / 10) : "")
    setEditedTaxAmount(tx.taxAmount != null ? String(tx.taxAmount) : "")
  }

  const handleTaxRateChange = (pct: string) => {
    setEditedTaxRate(pct)
    if (selected && pct !== "") {
      const rateDecimal = parseFloat(pct) / 100
      const computed = calculateTaxFromGross(selected.amount, rateDecimal)
      setEditedTaxAmount(computed > 0 ? String(computed) : "")
    }
  }

  const handleDocumentUploadComplete = (doc: TransactionDocumentWithUrl) => {
    setDocuments((prev) => [doc, ...prev])
    setEditedStatus("verified")
    router.refresh()
  }

  const handleDocumentDelete = (documentId: string) => {
    const remaining = documents.filter((d) => d.id !== documentId)
    setDocuments(remaining)
    if (remaining.length === 0) setEditedStatus("pending")
    router.refresh()
  }

  const handleSave = async () => {
    if (!selected) return
    setLoading(true)
    await updateEntryAction(selected.id, {
      categoryId: editedCategoryId,
      entryType: editedEntryType as "fixed" | "variable",
      status: editedStatus as "pending" | "verified" | "excluded",
      taxRate: editedTaxRate !== "" ? parseFloat(editedTaxRate) / 100 : null,
      taxAmount: editedTaxAmount !== "" ? parseFloat(editedTaxAmount) : null,
    })
    setLoading(false)
    setSelected(null)
    router.refresh()
  }

  const hasChanges =
    selected &&
    (editedCategoryId !== (selected.category?.id ?? null) ||
      editedEntryType !== (selected.entryType ?? "variable") ||
      editedStatus !== selected.status ||
      editedTaxRate !== (selected.taxRate != null ? String(Math.round(selected.taxRate * 1000) / 10) : "") ||
      editedTaxAmount !== (selected.taxAmount != null ? String(selected.taxAmount) : ""))

  function pushPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) params.delete("page")
    else params.set("page", String(p))
    router.push(`/transactions?${params.toString()}`)
  }

  const getEntryTypeBadge = (tx: TransactionRow) => {
    if (tx.direction === "income") {
      return <Badge variant="default" className="text-[10px] font-medium">{t("types.income")}</Badge>
    }
    if (tx.entryType === "fixed") {
      return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">{t("expenseTypes.fixed")}</Badge>
    }
    return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{t("expenseTypes.variable")}</Badge>
  }

  const getStatusBadge = (tx: TransactionRow) => {
    if (tx.status === "verified") {
      return <Badge variant="default">{t("statuses.verified")}</Badge>
    }
    if (tx.status === "excluded") {
      return <Badge variant="secondary">{t("statuses.excluded")}</Badge>
    }
    return <Badge variant="outline">{t("statuses.pending")}</Badge>
  }

  return (
    <>
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("editSheet.title")}</SheetTitle>
            <SheetDescription>
              {selected && (
                <>
                  {selected.description || "—"}
                  {" • "}
                  {selected.direction === "income" ? "+" : "-"}{formatCurrency(selected.amount, selected.currency)}
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="flex flex-col flex-1 gap-6 p-4">
              <div className="space-y-2">
                <Label>{t("editSheet.category")}</Label>
                <CategorySelect
                  value={editedCategoryId}
                  onValueChange={setEditedCategoryId}
                  categories={categories}
                  className="w-full"
                />
                {selected.categorySource && selected.categorySource !== "manual" && (
                  <p className="text-[11px] text-muted-foreground">{t("editSheet.autoCategory")}</p>
                )}
              </div>

              {selected.direction === "expense" && (
                <div className="space-y-2">
                  <Label>{t("editSheet.type")}</Label>
                  <Select value={editedEntryType} onValueChange={setEditedEntryType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {t("expenseTypes.fixed")}
                        </span>
                      </SelectItem>
                      <SelectItem value="variable">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {t("expenseTypes.variable")}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("editSheet.status")}</Label>
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
                    <SelectItem value="verified">{t("statuses.verified")}</SelectItem>
                    <SelectItem value="excluded">{t("statuses.excluded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("editSheet.taxRate")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editedTaxRate}
                    onChange={(e) => handleTaxRateChange(e.target.value)}
                    placeholder={t("editSheet.noTax")}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EU_VAT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleTaxRateChange(String(p))}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                        editedTaxRate === String(p)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-foreground"
                      }`}
                    >
                      {p === 0 ? t("editSheet.vatExempt") : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {editedTaxRate !== "" && (
                <div className="space-y-2">
                  <Label>{t("editSheet.taxAmount")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedTaxAmount}
                    onChange={(e) => setEditedTaxAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {selected.transactionId && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <Label>{t("editSheet.documents")}</Label>
                      </div>
                      {documents.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {documents.length}
                        </Badge>
                      )}
                    </div>

                    <TransactionDocumentList
                      documents={documents}
                      onDelete={handleDocumentDelete}
                      loading={documentsLoading}
                    />

                    <TransactionDocumentUpload
                      transactionId={selected.transactionId}
                      onUploadComplete={handleDocumentUploadComplete}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <SheetFooter className="mt-auto p-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
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

      {selectedIds.size > 0 && (
        <TransactionBulkActionBar
          selectedRows={selectedRows}
          onClearSelection={() => setSelectedIds(new Set())}
          categories={categories}
        />
      )}

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
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                {t("table.noTransactions")}
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx, index) => (
              <TableRow
                key={tx.id}
                className="cursor-pointer hover:bg-muted/50"
                data-state={selectedIds.has(tx.id) ? "selected" : undefined}
                onClick={() => handleRowClick(tx)}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(tx.id)}
                    onCheckedChange={() => toggleSelect(tx.id, index, shiftHeld.current)}
                    onClick={(e) => {
                      e.stopPropagation()
                      shiftHeld.current = e.shiftKey
                    }}
                    aria-label="Select row"
                  />
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {format(new Date(tx.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="max-w-[300px] whitespace-normal">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{tx.description || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {tx.category ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                      <span>{tx.category.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{getEntryTypeBadge(tx)}</TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  <span className={tx.direction === "income" ? "text-green-500" : ""}>
                    {tx.direction === "income" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(tx)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-3 border-t">
          <span>{t("pagination.total", { count: total })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => pushPage(page - 1)}>
              {t("pagination.previous")}
            </Button>
            <span>{t("pagination.page", { page, pages })}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => pushPage(page + 1)}>
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
