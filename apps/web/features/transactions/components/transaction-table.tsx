"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { TrendUp, TrendDown, MagnifyingGlass, X } from "@phosphor-icons/react"
import type { TransactionRow } from "@/features/transactions/queries/get-transactions"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface TransactionTableProps {
  transactions: TransactionRow[]
  total: number
  pages: number
  page: number
  type: string
  status: string
  search: string
}

const TYPE_LABELS: Record<string, string> = {
  all: "All",
  expense: "Expenses",
  income: "Income",
}

const STATUS_LABELS: Record<string, string> = {
  all: "All statuses",
  pending: "Pending",
  documented: "Documented",
  excluded: "Excluded",
}

export function TransactionTable({
  transactions,
  total,
  pages,
  page,
  type,
  status,
  search,
}: TransactionTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(search)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams()
    if (type && type !== "all") params.set("type", type)
    if (status && status !== "all") params.set("status", status)
    if (search) params.set("search", search)
    if (page > 1) params.set("page", String(page))
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== "all" && v !== "1") params.set(k, v)
      else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search: searchValue, page: "1" })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Type tabs */}
      <div className="flex items-center gap-1 border-b pb-0">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => updateParams({ type: key, page: "1" })}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              (type || "all") === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search..."
                className="h-8 pl-8 pr-8 text-xs w-48"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => { setSearchValue(""); updateParams({ search: "", page: "1" }) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </form>
          <Select
            value={status || "all"}
            onValueChange={(v) => updateParams({ status: v, page: "1" })}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow
                  key={`${tx.type}-${tx.id}`}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${tx.type === "expense" ? "expenses" : "incomes"}?highlight=${tx.id}`)}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(tx.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[280px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={
                          tx.category?.color
                            ? { backgroundColor: `${tx.category.color}20`, color: tx.category.color }
                            : { backgroundColor: tx.type === "income" ? "#22c55e20" : "#ef444420", color: tx.type === "income" ? "#22c55e" : "#ef4444" }
                        }
                      >
                        {tx.type === "income"
                          ? <TrendUp className="h-3.5 w-3.5" weight="bold" />
                          : (tx.description || "?")[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">{tx.description || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.type === "income" ? "default" : "secondary"} className="text-[10px] font-medium">
                      {tx.type === "income" ? "Income" : tx.expenseType === "fixed" ? "Fixed" : "Variable"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {tx.category ? (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: tx.category.color }}
                        />
                        <span className="truncate max-w-[120px]">{tx.category.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.status === "documented" ? "default"
                        : tx.status === "excluded" ? "secondary"
                        : "outline"
                      }
                      className="text-[10px]"
                    >
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-right whitespace-nowrap">
                    <span className={tx.type === "income" ? "text-green-500" : "text-red-500"}>
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} transactions</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span>Page {page} of {pages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= pages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
