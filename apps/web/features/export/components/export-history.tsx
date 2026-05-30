"use client"

import { format } from "date-fns"
import { FileZip, DownloadSimple, Trash, Spinner, Warning, CheckCircle, Clock } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { deleteExportAction } from "../actions/create-export"
import { useState } from "react"
import { useTranslations } from "next-intl"

interface Export {
  id: string
  name: string
  filePath: string
  fileSize: number | null
  startDate: Date
  endDate: Date
  entryCount: number | null
  documentCount: number | null
  status: string
  errorMessage: string | null
  createdAt: Date
}

interface ExportHistoryProps {
  exports: Export[]
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateRange(start: Date, end: Date): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
}

export function ExportHistory({ exports }: ExportHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const t = useTranslations("export")

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteExport"))) return

    setDeletingId(id)
    try {
      await deleteExportAction(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = (id: string) => {
    window.location.href = `/api/exports/${id}`
  }

  if (exports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileZip className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("noPreviousExports")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("exportsWillAppearHere")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {exports.map((exp) => (
        <div
          key={exp.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              exp.status === "completed"
                ? "bg-primary/10 text-primary"
                : exp.status === "failed"
                ? "bg-red-500/10 text-red-500"
                : "bg-amber-500/10 text-amber-500"
            }`}>
              {exp.status === "completed" ? (
                <FileZip className="h-5 w-5" weight="fill" />
              ) : exp.status === "failed" ? (
                <Warning className="h-5 w-5" weight="fill" />
              ) : (
                <Spinner className="h-5 w-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{exp.name}</p>
                {exp.status === "completed" && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" weight="fill" />
                )}
                {exp.status === "processing" && (
                  <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" weight="fill" />
                    {t("processing")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                {exp.status === "completed" && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span>{t("expenses", { count: exp.entryCount ?? 0 })}</span>
                    <span>·</span>
                    <span>{t("invoices", { count: exp.documentCount ?? 0 })}</span>
                    <span>·</span>
                    <span>{formatFileSize(exp.fileSize)}</span>
                  </>
                )}
                {exp.status === "failed" && exp.errorMessage && (
                  <span className="text-red-500">{exp.errorMessage}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:ml-4">
            {exp.status === "completed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(exp.id)}
              >
                <DownloadSimple className="h-4 w-4 mr-1" />
                {t("download")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(exp.id)}
              disabled={deletingId === exp.id}
            >
              {deletingId === exp.id ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Trash className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
