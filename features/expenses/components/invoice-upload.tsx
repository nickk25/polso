"use client"

import { useState, useCallback, useRef } from "react"
import { CloudArrowUp, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import type { InvoiceWithUrl } from "../actions/invoice-actions"

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface InvoiceUploadProps {
  expenseId: string
  onUploadComplete: (invoice: InvoiceWithUrl) => void
  disabled?: boolean
}

interface UploadingFile {
  file: File
  progress: number
  error?: string
}

export function InvoiceUpload({
  expenseId,
  onUploadComplete,
  disabled = false,
}: InvoiceUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Accepted: PDF, PNG, JPG, WEBP`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error("Invalid file", { description: error })
      return
    }

    setUploading({ file, progress: 0 })

    try {
      setUploading({ file, progress: 20 })

      // Upload via server (avoids CORS issues with R2)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("expenseId", expenseId)

      setUploading({ file, progress: 40 })

      const response = await fetch("/api/invoices/upload-url", {
        method: "POST",
        body: formData,
      })

      setUploading({ file, progress: 80 })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to upload file")
      }

      const invoice = await response.json()

      setUploading({ file, progress: 100 })

      onUploadComplete({
        id: invoice.id,
        fileName: invoice.fileName,
        filePath: invoice.filePath,
        fileSize: invoice.fileSize,
        mimeType: invoice.mimeType,
        createdAt: new Date(invoice.createdAt),
        downloadUrl: invoice.downloadUrl,
      })

      toast.success("Invoice uploaded", {
        description: file.name,
      })
    } catch (error) {
      console.error("Upload error:", error)
      setUploading({
        file,
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed",
      })
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTimeout(() => setUploading(null), 1000)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) {
      setIsDragOver(true)
    }
  }, [disabled, uploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled || uploading) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        uploadFile(files[0])
      }
    },
    [disabled, uploading, expenseId]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        transition-colors
        ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
        ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileSelect}
        disabled={disabled || !!uploading}
      />

      {uploading ? (
        <div className="space-y-2">
          <Spinner className="h-6 w-6 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground truncate max-w-[200px] mx-auto">
            {uploading.file.name}
          </p>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${uploading.progress}%` }}
            />
          </div>
          {uploading.error && (
            <p className="text-xs text-red-500">{uploading.error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <CloudArrowUp className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground/70">
            PDF, PNG, JPG, WEBP (max 10MB)
          </p>
        </div>
      )}
    </div>
  )
}
