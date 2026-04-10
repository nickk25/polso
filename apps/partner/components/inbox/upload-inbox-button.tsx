"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@polso/ui/dialog"
import { Spinner, UploadSimple } from "@phosphor-icons/react"
import { uploadInboxItemAction } from "@/features/inbox/actions/upload-inbox-item"
import { toast } from "sonner"

interface UploadInboxButtonProps {
  clientId: string
}

export function UploadInboxButton({ clientId }: UploadInboxButtonProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")

  const reset = () => {
    setFile(null)
    setDisplayName("")
    setAmount("")
    setDate("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !displayName) {
      // Pre-fill vendor name from file name (strip extension)
      setDisplayName(f.name.replace(/\.[^.]+$/, ""))
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")

      const result = await uploadInboxItemAction({
        clientId,
        fileName: file.name,
        fileData: base64,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
        displayName: displayName.trim() || undefined,
        amount: amount ? parseFloat(amount.replace(",", ".")) : undefined,
        currency: "EUR",
        date: date || undefined,
      })

      if (result.success) {
        toast.success("Recibo subido")
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
        Subir recibo
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir recibo</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Archivo <span className="text-red-500">*</span></Label>
              <Input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · {file.type}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Proveedor (opcional)</Label>
              <Input
                placeholder="Nombre del proveedor"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importe (opcional)</Label>
                <Input
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha (opcional)</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!file || loading}>
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
