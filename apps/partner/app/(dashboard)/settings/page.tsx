import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"

export default async function SettingsPage() {
  const ctx = await getPartnerAuthContext()
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { id: true, name: true, type: true, createdAt: true },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm">Información y preferencias de tu asesoría</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">Información de la asesoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Nombre</p>
            <p className="text-sm font-medium">{org?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ID de organización</p>
            <p className="text-sm font-mono text-muted-foreground">{ctx.organizationId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-sm font-medium capitalize">{org?.type ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
