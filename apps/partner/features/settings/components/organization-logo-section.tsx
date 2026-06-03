"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { UploadSimple, Trash } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { uploadOrganizationLogoAction } from "../actions/upload-organization-logo"
import { deleteOrganizationLogoAction } from "../actions/delete-organization-logo"

const MAX_SIZE = 1 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

export function OrganizationLogoSection({
  orgId,
  hasLogo,
}: {
  orgId: string
  hasLogo: boolean
}) {
  const [logoExists, setLogoExists] = useState(hasLogo)
  const [imgKey, setImgKey] = useState(0) // force re-render after upload
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPG, WebP o SVG.")
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error("El archivo es demasiado grande. Máximo 1 MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const fileData = (reader.result as string).split(",")[1]
      startTransition(async () => {
        const res = await uploadOrganizationLogoAction({
          fileName: file.name,
          fileData,
          contentType: file.type,
          fileSize: file.size,
        })
        if (res.success) {
          toast.success("Logo actualizado")
          setLogoExists(true)
          setImgKey((k) => k + 1)
        } else {
          toast.error(res.error ?? "Error al subir el logo")
        }
      })
    }
    reader.readAsDataURL(file)
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteOrganizationLogoAction()
      if (res.success) {
        toast.success("Logo eliminado")
        setLogoExists(false)
      } else {
        toast.error(res.error ?? "Error al eliminar el logo")
      }
    })
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden">
        {logoExists ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imgKey}
            src={`/api/org-logo/${orgId}`}
            alt="Logo"
            className="h-full w-full object-contain"
            onError={() => setLogoExists(false)}
          />
        ) : (
          <span className="text-xl font-bold text-muted-foreground">P</span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          PNG, JPG, WebP o SVG. Máximo 1 MB.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            <UploadSimple className="mr-2 h-4 w-4" />
            {logoExists ? "Cambiar logo" : "Subir logo"}
          </Button>
          {logoExists && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
