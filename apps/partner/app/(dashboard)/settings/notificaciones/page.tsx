import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { NotificationSettingsSection } from "@/features/settings/components/notification-settings-section"

export default async function NotificacionesPage() {
  const ctx = await getPartnerAuthContext()

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      digestCadence: true,
      notifyOnClientConnected: true,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettingsSection
            digestCadence={org?.digestCadence ?? "daily"}
            notifyOnClientConnected={org?.notifyOnClientConnected ?? true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
