"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { FilePdf, Image, Trash, Eye, DownloadSimple, Spinner } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { deleteInvoiceAction, type InvoiceWithUrl } from "../actions/invoice-actions"
import { InvoicePreviewDialog } from "./invoice-preview-dialog"

interface InvoiceListProps {
  invoices: InvoiceWithUrl[]
  onDelete: (invoiceId: string) => void
  loading?: boolean
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function getFileIcon(mimeType: string | null) {
  if (mimeType === "application/pdf") {
    return <FilePdf className="h-4 w-4 text-red-500" />
  }
  return <Image className="h-4 w-4 text-blue-500" />
}

export function InvoiceList({ invoices, onDelete, loading = false }: InvoiceListProps) {
  const t = useTranslations("expenses")
  const tc = useTranslations("common")
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithUrl | null>(null)
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceWithUrl | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteInvoice) return

    setDeleting(true)
    try {
      const result = await deleteInvoiceAction(deleteInvoice.id)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete invoice")
      }

      onDelete(deleteInvoice.id)
      toast.success(t("invoices.deleted"))
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(t("invoices.deleteFailed"), {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
      setDeleteInvoice(null)
    }
  }

  const handleDownload = async (invoice: InvoiceWithUrl) => {
    try {
      const response = await fetch(invoice.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = invoice.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
      toast.error(t("invoices.downloadFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return null
  }

  return (
    <>
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {getFileIcon(invoice.mimeType)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{invoice.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(invoice.fileSize)}
                  {invoice.fileSize && " • "}
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setPreviewInvoice(invoice)}
                title={t("invoices.preview")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => handleDownload(invoice)}
                title={t("invoices.download")}
              >
                <DownloadSimple className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => setDeleteInvoice(invoice)}
                title={tc("actions.delete")}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <InvoicePreviewDialog
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invoices.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("invoices.deleteDescription", { name: deleteInvoice?.fileName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  {tc("actions.deleting")}
                </>
              ) : (
                tc("actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
