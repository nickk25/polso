"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { FilePdf, Image, Trash, Eye, DownloadSimple, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@polso/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@polso/ui/dialog"
import { toast } from "sonner"
import { deleteTransactionDocumentAction, type TransactionDocumentWithUrl } from "../actions/document-actions"
import { unmatchAction } from "@/features/inbox/actions/vault-actions"
import { LinkBreak } from "@phosphor-icons/react"

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (mimeType === "application/pdf") {
    return <FilePdf className="h-4 w-4 text-red-500" />
  }
  return <Image className="h-4 w-4 text-blue-500" />
}

interface TransactionDocumentListProps {
  documents: TransactionDocumentWithUrl[]
  onDelete: (documentId: string) => void
  loading?: boolean
}

export function TransactionDocumentList({
  documents,
  onDelete,
  loading = false,
}: TransactionDocumentListProps) {
  const t = useTranslations("transactions")
  const tc = useTranslations("common")
  const [previewDoc, setPreviewDoc] = useState<TransactionDocumentWithUrl | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<TransactionDocumentWithUrl | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteDoc) return
    setDeleting(true)
    try {
      const result =
        deleteDoc.source === "inbox"
          ? await unmatchAction(deleteDoc.id)
          : await deleteTransactionDocumentAction(deleteDoc.id)
      if (!result.success) throw new Error(result.error || "Failed to remove document")
      onDelete(deleteDoc.id)
      toast.success(t("invoices.deleted"))
    } catch (error) {
      toast.error(t("invoices.deleteFailed"), {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
      setDeleteDoc(null)
    }
  }

  const handleDownload = async (doc: TransactionDocumentWithUrl) => {
    try {
      const response = await fetch(doc.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
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

  if (documents.length === 0) return null

  const isPdf = previewDoc?.mimeType === "application/pdf"
  const isImage = previewDoc?.mimeType?.startsWith("image/")

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {getFileIcon(doc.mimeType)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  {doc.source === "inbox" && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {t("invoices.vaultBadge")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                  {doc.fileSize && " • "}
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setPreviewDoc(doc)}
                title={t("invoices.preview")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => handleDownload(doc)}
                title={t("invoices.download")}
              >
                <DownloadSimple className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${doc.source === "inbox" ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" : "text-red-500 hover:text-red-600 hover:bg-red-500/10"}`}
                onClick={() => setDeleteDoc(doc)}
                title={doc.source === "inbox" ? t("invoices.unlink") : tc("actions.delete")}
              >
                {doc.source === "inbox" ? <LinkBreak className="h-4 w-4" /> : <Trash className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate">{previewDoc?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto bg-muted rounded-lg">
            {isPdf && (
              <iframe
                src={previewDoc!.downloadUrl}
                className="w-full h-full min-h-[500px] rounded-lg"
                title={previewDoc!.fileName}
              />
            )}
            {isImage && (
              <div className="flex items-center justify-center p-4 min-h-[400px]">
                <img
                  src={previewDoc!.downloadUrl}
                  alt={previewDoc!.fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
            {!isPdf && !isImage && (
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                <p className="text-muted-foreground mb-4">{t("invoices.previewNotAvailable")}</p>
                <Button onClick={() => previewDoc && handleDownload(previewDoc)}>
                  <DownloadSimple className="h-4 w-4 mr-2" />
                  {t("invoices.downloadToView")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDoc?.source === "inbox" ? t("invoices.unlinkTitle") : t("invoices.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDoc?.source === "inbox"
                ? t("invoices.unlinkDescription", { name: deleteDoc?.fileName ?? "" })
                : t("invoices.deleteDescription", { name: deleteDoc?.fileName ?? "" })}
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
