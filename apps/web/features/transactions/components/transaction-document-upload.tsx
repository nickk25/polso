"use client"

import { useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { CloudArrowUp, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import type { TransactionDocumentWithUrl } from "../actions/document-actions"

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface TransactionDocumentUploadProps {
  transactionId: string
  onUploadComplete: (doc: TransactionDocumentWithUrl) => void
  disabled?: boolean
}

export function TransactionDocumentUpload({
  transactionId,
  onUploadComplete,
  disabled = false,
}: TransactionDocumentUploadProps) {
  const t = useTranslations("expenses")
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState<{ file: File; progress: number; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("invoices.invalidFile"), { description: t("invoices.invalidType", { type: file.type }) })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("invoices.invalidFile"), { description: t("invoices.fileTooLarge", { size: (file.size / 1024 / 1024).toFixed(1) }) })
      return
    }

    setUploading({ file, progress: 20 })

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("transactionId", transactionId)

      setUploading({ file, progress: 40 })

      const response = await fetch("/api/transaction-documents/upload-url", {
        method: "POST",
        body: formData,
      })

      setUploading({ file, progress: 80 })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      const doc = await response.json()
      setUploading({ file, progress: 100 })

      onUploadComplete({
        id: doc.id,
        fileName: doc.fileName,
        filePath: doc.filePath,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        createdAt: new Date(doc.createdAt),
        downloadUrl: doc.downloadUrl,
      })

      toast.success(t("invoices.uploaded"), { description: file.name })
    } catch (error) {
      setUploading({ file, progress: 0, error: error instanceof Error ? error.message : "Upload failed" })
      toast.error(t("invoices.uploadFailed"), { description: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setTimeout(() => setUploading(null), 1000)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (disabled || uploading) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) uploadFile(files[0])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, uploading, transactionId]
  )

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
        ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setIsDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
      onDrop={handleDrop}
      onClick={() => { if (!disabled && !uploading) fileInputRef.current?.click() }}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (fileInputRef.current) fileInputRef.current.value = "" }}
        disabled={disabled || !!uploading}
      />
      {uploading ? (
        <div className="space-y-2">
          <Spinner className="h-6 w-6 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground truncate max-w-[200px] mx-auto">{uploading.file.name}</p>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploading.progress}%` }} />
          </div>
          {uploading.error && <p className="text-xs text-red-500">{uploading.error}</p>}
        </div>
      ) : (
        <div className="space-y-1">
          <CloudArrowUp className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("invoices.dropzone")}</p>
          <p className="text-xs text-muted-foreground/70">{t("invoices.dropzoneFormats")}</p>
        </div>
      )}
    </div>
  )
}
