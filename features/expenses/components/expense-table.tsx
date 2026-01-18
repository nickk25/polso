"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Spinner, Sparkle, Receipt } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CategorySelect } from "@/features/categories/components/category-select"
import { updateExpenseAction } from "../actions/update-expense"
import { getExpenseInvoicesAction, type InvoiceWithUrl } from "../actions/invoice-actions"
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

function getStatusBadge(status: string) {
  switch (status) {
    case "documented":
      return <Badge variant="default">Documented</Badge>
    case "excluded":
      return <Badge variant="secondary">Excluded</Badge>
    case "pending":
    default:
      return <Badge variant="outline">Pending</Badge>
  }
}

function getExpenseTypeBadge(type: string) {
  switch (type) {
    case "fixed":
      return (
        <Badge
          variant="destructive"
          className="bg-red-500/10 text-red-500 border-red-500/20"
        >
          Fixed
        </Badge>
      )
    case "variable":
    default:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-amber-500 border-amber-500/20"
        >
          Variable
        </Badge>
      )
  }
}

function formatCategorySource(source: string | null): string {
  switch (source) {
    case "vendor":
      return "Vendor default"
    case "plaid":
      return "Bank category"
    case "keyword":
      return "Merchant match"
    case "manual":
      return "Manually set"
    default:
      return "Unknown"
  }
}

export function ExpenseTable({ expenses, categories }: ExpenseTableProps) {
  const router = useRouter()
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [editedExpenseType, setEditedExpenseType] = useState<string>("")
  const [editedStatus, setEditedStatus] = useState<string>("")
  const [invoices, setInvoices] = useState<InvoiceWithUrl[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // Load invoices when expense is selected
  useEffect(() => {
    if (selectedExpense) {
      setInvoicesLoading(true)
      getExpenseInvoicesAction(selectedExpense.id)
        .then((result) => {
          if (result.success) {
            setInvoices(result.data)
          }
        })
        .finally(() => setInvoicesLoading(false))
    } else {
      setInvoices([])
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
    // If no invoices remain, status is set to "pending" on the server
    if (newInvoices.length === 0) {
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow
              key={expense.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(expense)}
            >
              <TableCell className="font-medium">
                {format(new Date(expense.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {expense.vendor?.name ||
                      expense.transaction?.merchantName ||
                      expense.transaction?.name ||
                      expense.description ||
                      "Unknown"}
                  </span>
                  {expense.transaction?.category && (
                    <span className="text-xs text-muted-foreground">
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
                          <p className="font-medium">Auto-categorized</p>
                          <p className="text-muted-foreground">
                            {formatCategorySource(expense.categorySource)}
                            {expense.categoryConfidence && (
                              <> • {Math.round(expense.categoryConfidence * 100)}% confidence</>
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
              <TableCell>{getStatusBadge(expense.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Expense</SheetTitle>
            <SheetDescription>
              {selectedExpense && (
                <>
                  {selectedExpense.vendor?.name ||
                    selectedExpense.transaction?.merchantName ||
                    selectedExpense.transaction?.name ||
                    selectedExpense.description ||
                    "Unknown"}
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
                  <Label>Category</Label>
                  {selectedExpense.categorySource && selectedExpense.categorySource !== "manual" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                          <Sparkle weight="fill" className="h-3 w-3" />
                          Auto
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Auto-categorized</p>
                        <p className="text-muted-foreground">
                          {formatCategorySource(selectedExpense.categorySource)}
                          {selectedExpense.categoryConfidence && (
                            <> • {Math.round(selectedExpense.categoryConfidence * 100)}% confidence</>
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
                <Label>Expense Type</Label>
                <Select value={editedExpenseType} onValueChange={setEditedExpenseType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Fixed
                      </span>
                    </SelectItem>
                    <SelectItem value="variable">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Variable
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="documented">Documented</SelectItem>
                    <SelectItem value="excluded">Excluded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Invoices & Receipts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <Label>Invoices & Receipts</Label>
                  </div>
                  {invoices.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {invoices.length}
                    </Badge>
                  )}
                </div>

                <InvoiceList
                  invoices={invoices}
                  onDelete={handleInvoiceDelete}
                  loading={invoicesLoading}
                />

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
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading || !hasChanges}>
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
