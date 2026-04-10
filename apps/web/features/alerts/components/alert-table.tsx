"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Checkbox } from "@polso/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { Check, X, Spinner } from "@phosphor-icons/react"
import {
  markAlertReadAction,
  dismissAlertAction,
  markAllReadAction,
  dismissAllAction,
} from "@/features/alerts/actions/update-alert"
import type { AlertWithRelations } from "@/features/alerts/queries/get-alerts"

interface AlertTableProps {
  alerts: AlertWithRelations[]
}

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
}

export function AlertTable({ alerts }: AlertTableProps) {
  const router = useRouter()
  const t = useTranslations("alerts")
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds.size])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(alerts.map((a) => a.id)))
    }
  }

  const allSelected = alerts.length > 0 && selectedIds.size === alerts.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < alerts.length

  const handleMarkRead = (alertId: string) => {
    setLoadingId(alertId)
    startTransition(async () => {
      await markAlertReadAction(alertId)
      setLoadingId(null)
      router.refresh()
    })
  }

  const handleDismiss = (alertId: string) => {
    setLoadingId(alertId)
    startTransition(async () => {
      await dismissAlertAction(alertId)
      setLoadingId(null)
      router.refresh()
    })
  }

  const handleBulkMarkRead = () => {
    startTransition(async () => {
      await markAllReadAction()
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  const handleBulkDismiss = () => {
    startTransition(async () => {
      await dismissAllAction()
      setSelectedIds(new Set())
      router.refresh()
    })
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
            <TableHead className="w-[120px]">{t("table.date")}</TableHead>
            <TableHead className="w-[140px]">{t("table.type")}</TableHead>
            <TableHead>{t("table.message")}</TableHead>
            <TableHead className="w-[110px]">{t("table.severity")}</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow
              key={alert.id}
              className={alert.isRead ? "opacity-60" : ""}
              data-state={selectedIds.has(alert.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(alert.id)}
                  onCheckedChange={() => toggleSelect(alert.id)}
                  aria-label="Select row"
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(alert.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-medium">
                  {t(`types.${alert.type}` as Parameters<typeof t>[0])}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span className={alert.isRead ? "" : "font-medium"}>
                  {alert.message}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "outline"}>
                  {t(`severity.${alert.severity}` as Parameters<typeof t>[0])}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {loadingId === alert.id ? (
                    <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleMarkRead(alert.id)}
                          disabled={isPending}
                          title={t("actions.markRead")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismiss(alert.id)}
                        disabled={isPending}
                        title={t("actions.dismiss")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
          {isPending && <Spinner className="h-4 w-4 animate-spin" />}
          <span className="text-sm font-medium">
            {t("bulk.selected", { count: selectedIds.size })}
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkMarkRead}
            disabled={isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            {t("bulk.markRead")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDismiss}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            {t("bulk.dismiss")}
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            {t("bulk.deselect")}
          </Button>
        </div>
      )}
    </>
  )
}
