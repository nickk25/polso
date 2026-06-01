"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { CloudArrowUp, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { toast } from "sonner"

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function VaultUploadButton() {
  const t = useTranslations("vault")
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("upload.invalidType"))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("upload.fileTooLarge"))
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/vault/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      toast.success(t("upload.success"))
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
        className="hidden"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
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
