"use client"

import { useTranslations } from "next-intl"
import { DownloadSimple, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { InvoiceWithUrl } from "../actions/invoice-actions"

interface InvoicePreviewDialogProps {
  invoice: InvoiceWithUrl | null
  onClose: () => void
  onDownload: (invoice: InvoiceWithUrl) => void
}

export function InvoicePreviewDialog({
  invoice,
  onClose,
  onDownload,
}: InvoicePreviewDialogProps) {
  const t = useTranslations("expenses")

  if (!invoice) return null

  const isPdf = invoice.mimeType === "application/pdf"
  const isImage = invoice.mimeType?.startsWith("image/")

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{invoice.fileName}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(invoice)}
              className="flex-shrink-0"
            >
              <DownloadSimple className="h-4 w-4 mr-2" />
              {t("invoices.download")}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-muted rounded-lg">
          {isPdf && (
            <iframe
              src={invoice.downloadUrl}
              className="w-full h-full min-h-[500px] rounded-lg"
              title={invoice.fileName}
            />
          )}

          {isImage && (
            <div className="flex items-center justify-center p-4 min-h-[400px]">
              <img
                src={invoice.downloadUrl}
                alt={invoice.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {!isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <p className="text-muted-foreground mb-4">
                {t("invoices.previewNotAvailable")}
              </p>
              <Button onClick={() => onDownload(invoice)}>
                <DownloadSimple className="h-4 w-4 mr-2" />
                {t("invoices.downloadToView")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
