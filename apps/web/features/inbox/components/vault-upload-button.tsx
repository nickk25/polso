"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CloudArrowUp, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { toast } from "@polso/ui/sonner"

import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

export function VaultUploadButton() {
  const t = useTranslations("vault")
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList) {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
        toast.error(t("upload.invalidType"), { description: file.name })
        return
      }
      if (file.size > UPLOAD_MAX_FILE_SIZE) {
        toast.error(t("upload.fileTooLarge"), { description: file.name })
        return
      }
    }

    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of fileArray) formData.append("file", file)

      const res = await fetch("/api/vault/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      toast.success(
        data.uploaded === 1 ? t("upload.success") : t("upload.successMultiple", { count: data.uploaded })
      )
      router.refresh()
    } catch (error) {
      toast.error(t("upload.error"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={UPLOAD_ACCEPTED_TYPES.join(",")}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading
          ? <Spinner className="h-4 w-4 mr-2 animate-spin" />
          : <CloudArrowUp className="h-4 w-4 mr-2" />}
        {uploading ? t("upload.uploading") : t("upload.button")}
      </Button>
    </>
  )
}
