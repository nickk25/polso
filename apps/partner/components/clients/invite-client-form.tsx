"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { inviteClientAction } from "@/features/clients/actions/invite-client"

export function InviteClientForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ clientName: "", email: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await inviteClientAction(form)
    setLoading(false)

    if (result.success) {
      toast.success("Invitación enviada correctamente")
      router.push("/clients")
    } else {
      toast.error(result.error ?? "Error al enviar la invitación")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div className="space-y-2">
        <Label htmlFor="clientName">Nombre del cliente / empresa</Label>
        <Input
          id="clientName"
          value={form.clientName}
          onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
          required
          placeholder="Nombre de la empresa o autónomo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
          placeholder="cliente@ejemplo.com"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar invitación"}
      </Button>
    </form>
  )
}
