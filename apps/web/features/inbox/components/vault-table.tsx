"use client"

import { useRouter, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
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

const STATUS_ICONS: Record<string, React.ElementType> = {
  done: CheckCircle,
  suggested_match: Question,
  no_match: XCircle,
  new: Clock,
  processing: Spinner,
  analyzing: Spinner,
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  done: "default",
  suggested_match: "outline",
  no_match: "destructive",
  new: "secondary",
  processing: "secondary",
  analyzing: "secondary",
}

const FILTER_KEYS = ["all", "done", "suggested_match", "no_match", "new"] as const
const STATUS_KEYS = ["done", "suggested_match", "no_match", "new", "processing", "analyzing"] as const
const SOURCE_KEYS = ["upload", "whatsapp", "telegram", "email"] as const

interface VaultTableProps {
  items: VaultItem[]
  total: number
  pages: number
  page: number
  statusFilter: string
}

export function VaultTable({ items, total, pages, page, statusFilter }: VaultTableProps) {
  const t = useTranslations("vault")
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
      <div className="flex items-center gap-1 border-b">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              statusFilter === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`filters.${key}`)}
          </button>
        ))}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{t("table.document")}</TableHead>
              <TableHead className="text-xs">{t("table.source")}</TableHead>
              <TableHead className="text-xs">{t("table.uploaded")}</TableHead>
              <TableHead className="text-xs">{t("table.amount")}</TableHead>
              <TableHead className="text-xs">{t("table.status")}</TableHead>
              <TableHead className="text-xs">{t("table.matchedTo")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                  {t("table.noDocuments")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isPdf = item.fileName.toLowerCase().endsWith(".pdf")
                const statusKey = STATUS_KEYS.includes(item.status as typeof STATUS_KEYS[number]) ? item.status : "new"
                const Icon = STATUS_ICONS[statusKey] ?? Clock
                const variant = STATUS_VARIANTS[statusKey] ?? "secondary"

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
                      {SOURCE_KEYS.includes(item.source as typeof SOURCE_KEYS[number])
                        ? t(`sources.${item.source as typeof SOURCE_KEYS[number]}`)
                        : item.source}
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
                      <Badge variant={variant} className="text-[10px] gap-1">
                        <Icon className="h-3 w-3" />
                        {t(`statuses.${statusKey as typeof STATUS_KEYS[number]}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.transaction ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium truncate max-w-[180px]">
                            {item.transaction.merchantName ?? item.transaction.description ?? t("table.transactionFallback")}
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
          <span>{t("pagination.total", { count: total })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setFilter(statusFilter, page - 1)}>
              {t("pagination.previous")}
            </Button>
            <span>{t("pagination.page", { page, pages })}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setFilter(statusFilter, page + 1)}>
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
