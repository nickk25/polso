"use client"

import { useRouter, usePathname } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import {
  FilePdf,
  FileImage,
  CheckCircle,
  XCircle,
  Question,
  Clock,
  Spinner,
} from "@phosphor-icons/react"
import type { VaultItem } from "@/features/inbox/queries/get-vault"

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; Icon: React.ElementType }> = {
  done: { label: "Matched", variant: "default", Icon: CheckCircle },
  suggested_match: { label: "Suggested", variant: "outline", Icon: Question },
  no_match: { label: "No match", variant: "destructive", Icon: XCircle },
  new: { label: "New", variant: "secondary", Icon: Clock },
  processing: { label: "Processing", variant: "secondary", Icon: Spinner },
  analyzing: { label: "Analyzing", variant: "secondary", Icon: Spinner },
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All documents",
  done: "Matched",
  suggested_match: "Suggested",
  no_match: "No match",
  new: "New",
}

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
}

interface VaultTableProps {
  items: VaultItem[]
  total: number
  pages: number
  page: number
  statusFilter: string
}

export function VaultTable({ items, total, pages, page, statusFilter }: VaultTableProps) {
  const router = useRouter()
  const pathname = usePathname()

  function setFilter(status: string, newPage = 1) {
    const params = new URLSearchParams()
    if (status !== "all") params.set("status", status)
    if (newPage > 1) params.set("page", String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b">
        {Object.entries(STATUS_FILTER_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Document</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs">Uploaded</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Matched to</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  No documents yet. Upload receipts via WhatsApp, Telegram, or the upload button.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isPdf = item.fileName.toLowerCase().endsWith(".pdf")
                const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.new
                const { Icon } = statusCfg

                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        {isPdf
                          ? <FilePdf className="h-4 w-4 text-red-500 shrink-0" weight="fill" />
                          : <FileImage className="h-4 w-4 text-blue-500 shrink-0" weight="fill" />}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {item.displayName ?? item.fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {item.fileName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[item.source] ?? item.source}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {item.amount != null
                        ? formatCurrency(item.amount, item.currency)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusCfg.variant} className="text-[10px] gap-1">
                        <Icon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.transaction ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium truncate max-w-[180px]">
                            {item.transaction.merchantName ?? item.transaction.description ?? "Transaction"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(item.transaction.date), "MMM d")}
                            {" · "}
                            {formatCurrency(item.transaction.amount, item.currency)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} documents</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1}
              onClick={() => setFilter(statusFilter, page - 1)}>
              Previous
            </Button>
            <span>Page {page} of {pages}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pages}
              onClick={() => setFilter(statusFilter, page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
