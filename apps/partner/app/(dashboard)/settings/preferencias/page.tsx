import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { ReminderSettingsSection } from "@/features/settings/components/reminder-settings-section"
import { InvitationExpirySection } from "@/features/settings/components/invitation-expiry-section"
import { ExportDefaultsSection } from "@/features/settings/components/export-defaults-section"

export default async function PreferenciasPage() {
  const ctx = await getPartnerAuthContext()

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      reminderCooldownHours: true,
      receiptReminderHours: true,
      autoRemindersEnabled: true,
      invitationExpiryDays: true,
      csvSeparator: true,
      defaultExportRange: true,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recordatorios a clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ReminderSettingsSection
            reminderCooldownHours={org?.reminderCooldownHours ?? 24}
            receiptReminderHours={org?.receiptReminderHours ?? 48}
            autoRemindersEnabled={org?.autoRemindersEnabled ?? true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Invitaciones a clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationExpirySection days={org?.invitationExpiryDays ?? 7} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exportación</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportDefaultsSection
            csvSeparator={org?.csvSeparator ?? ";"}
            defaultExportRange={org?.defaultExportRange ?? "month"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
