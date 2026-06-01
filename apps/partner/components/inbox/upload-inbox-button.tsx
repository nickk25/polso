"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@polso/ui/dialog"
import { Spinner, UploadSimple } from "@phosphor-icons/react"
import { uploadInboxItemAction } from "@/features/inbox/actions/upload-inbox-item"
import { toast } from "@polso/ui/sonner"
import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_FILE_SIZE } from "@/lib/upload"

interface UploadInboxButtonProps {
  clientId: string
}

export function UploadInboxButton({ clientId }: UploadInboxButtonProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const reset = () => {
    setSelectedFiles([])
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(
      (f) => UPLOAD_ACCEPTED_TYPES.includes(f.type) && f.size <= UPLOAD_MAX_FILE_SIZE
    )
    if (valid.length < files.length) {
      toast.error("Algunos archivos no son válidos (tipo o tamaño)")
    }
    setSelectedFiles(valid)
  }

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return

    setLoading(true)
    try {
      const filesPayload = await Promise.all(
        selectedFiles.map(async (file) => {
          const buffer = await file.arrayBuffer()
          return {
            fileName: file.name,
            fileData: Buffer.from(buffer).toString("base64"),
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          }
        })
      )

      const result = await uploadInboxItemAction({ clientId, files: filesPayload })

      if (result.success) {
        toast.success(
          selectedFiles.length === 1
            ? "Comprobante subido — procesando en segundo plano"
            : `${selectedFiles.length} comprobantes subidos — procesando en segundo plano`
        )
        setOpen(false)
        reset()
        router.refresh()
      } else {
        toast.error("Error al subir", { description: result.error })
      }
    } catch {
      toast.error("Error al procesar el archivo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UploadSimple className="mr-2 h-4 w-4" />
        Subir comprobante
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir comprobante</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Input
                ref={fileRef}
                type="file"
                multiple
                accept={UPLOAD_ACCEPTED_TYPES.join(",")}
                onChange={handleFileChange}
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length === 1
                    ? `${selectedFiles[0]!.name} · ${(selectedFiles[0]!.size / 1024).toFixed(0)} KB`
                    : `${selectedFiles.length} archivos seleccionados`}
                </p>
              )}
              <p className="text-xs text-muted-foreground/70">
                El OCR extraerá proveedor, importe e IVA automáticamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={selectedFiles.length === 0 || loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Subir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
