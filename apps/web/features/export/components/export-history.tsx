"use client"

import { format } from "date-fns"
import { FileZip, DownloadSimple, Trash, Spinner, Warning, CheckCircle } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
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
        <p className="text-sm text-muted-foreground">{t("noPreviousExports")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("exportsWillAppearHere")}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{t("table.name")}</TableHead>
            <TableHead className="text-xs">{t("table.period")}</TableHead>
            <TableHead className="text-xs">{t("table.entries")}</TableHead>
            <TableHead className="text-xs">{t("table.documents")}</TableHead>
            <TableHead className="text-xs">{t("table.size")}</TableHead>
            <TableHead className="text-xs">{t("table.status")}</TableHead>
            <TableHead className="text-xs w-20">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exports.map((exp) => (
            <TableRow key={exp.id}>
              <TableCell className="text-xs font-medium max-w-[160px]">
                <span className="truncate block">{exp.name}</span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(exp.startDate), "MMM d")} – {format(new Date(exp.endDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {exp.entryCount ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {exp.documentCount ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatFileSize(exp.fileSize)}
              </TableCell>
              <TableCell>
                {exp.status === "completed" && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {t("statuses.completed")}
                  </Badge>
                )}
                {exp.status === "processing" && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Spinner className="h-3 w-3 animate-spin" />
                    {t("statuses.processing")}
                  </Badge>
                )}
                {exp.status === "failed" && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <Warning className="h-3 w-3" />
                    {t("statuses.failed")}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {exp.status === "completed" && (
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(exp.id)}>
                      <DownloadSimple className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(exp.id)}
                    disabled={deletingId === exp.id}
                  >
                    {deletingId === exp.id
                      ? <Spinner className="h-4 w-4 animate-spin" />
                      : <Trash className="h-4 w-4 text-muted-foreground" />
                    }
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
