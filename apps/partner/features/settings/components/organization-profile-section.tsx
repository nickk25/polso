"use client"

import { useState, useTransition } from "react"
import { toast } from "@polso/ui/sonner"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { updateOrganizationProfileAction } from "../actions/update-organization-profile"

interface Props {
  name: string
  taxId: string | null
  address: string | null
  contactEmail: string | null
}

export function OrganizationProfileSection({ name, taxId, address, contactEmail }: Props) {
  const initial = { name, taxId: taxId ?? "", address: address ?? "", contactEmail: contactEmail ?? "" }
  const [values, setValues] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const hasChanges =
    values.name !== initial.name ||
    values.taxId !== initial.taxId ||
    values.address !== initial.address ||
    values.contactEmail !== initial.contactEmail

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateOrganizationProfileAction({
        name: values.name,
        taxId: values.taxId || null,
        address: values.address || null,
        contactEmail: values.contactEmail || null,
      })
      if (res.success) {
        toast.success("Perfil actualizado")
      } else {
        toast.error(res.error ?? "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre de la asesoría *</Label>
          <Input
            id="org-name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-taxid">NIF / CIF</Label>
          <Input
            id="org-taxid"
            value={values.taxId}
            onChange={(e) => setValues((v) => ({ ...v, taxId: e.target.value }))}
            placeholder="B12345678"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-email">Email de contacto</Label>
          <Input
            id="org-email"
            type="email"
            value={values.contactEmail}
            onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))}
            placeholder="hola@asesoriaejemplo.com"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-address">Dirección</Label>
          <Input
            id="org-address"
            value={values.address}
            onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
            placeholder="Calle Ejemplo 1, Madrid"
            disabled={isPending}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending || !values.name.trim() || !hasChanges}>
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}
