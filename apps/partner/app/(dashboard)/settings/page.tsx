import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { neonAuth } from "@neondatabase/auth/next/server"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Separator } from "@polso/ui/separator"
import { OrganizationProfileSection } from "@/features/settings/components/organization-profile-section"
import { OrganizationLogoSection } from "@/features/settings/components/organization-logo-section"
import { ReminderSettingsSection } from "@/features/settings/components/reminder-settings-section"
import { InvitationExpirySection } from "@/features/settings/components/invitation-expiry-section"
import { ExportDefaultsSection } from "@/features/settings/components/export-defaults-section"
import { NotificationSettingsSection } from "@/features/settings/components/notification-settings-section"
import { RegionalSettingsSection } from "@/features/settings/components/regional-settings-section"
import { TeamMembersSection } from "@/features/team/components/team-members-section"
import { InviteTeammateDialog } from "@/features/team/components/invite-teammate-dialog"
import { getTeamData } from "@/features/team/queries/get-team-data"

export default async function SettingsPage() {
  const ctx = await getPartnerAuthContext()
  const { user } = await neonAuth()

  const [org, teamData] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        id: true,
        name: true,
        taxId: true,
        address: true,
        contactEmail: true,
        logoFilePath: true,
        reminderCooldownHours: true,
        receiptReminderHours: true,
        autoRemindersEnabled: true,
        invitationExpiryDays: true,
        csvSeparator: true,
        defaultExportRange: true,
        digestCadence: true,
        notifyOnClientConnected: true,
        currency: true,
        timezone: true,
        fiscalYearStart: true,
        dateFormat: true,
      },
    }),
    getTeamData(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm">Información y preferencias de tu asesoría</p>
      </div>

      {/* Información de la asesoría */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información de la asesoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <OrganizationLogoSection orgId={ctx.organizationId} hasLogo={!!org?.logoFilePath} />
          <Separator />
          <OrganizationProfileSection
            name={org?.name ?? ""}
            taxId={org?.taxId ?? null}
            address={org?.address ?? null}
            contactEmail={org?.contactEmail ?? null}
          />
        </CardContent>
      </Card>

      {/* Equipo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Equipo</CardTitle>
          <InviteTeammateDialog />
        </CardHeader>
        <CardContent>
          <TeamMembersSection
            members={teamData.members}
            invitations={teamData.invitations}
            currentUserId={user?.id ?? ""}
          />
        </CardContent>
      </Card>

      {/* Recordatorios a clientes */}
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

      {/* Invitaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Invitaciones a clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationExpirySection days={org?.invitationExpiryDays ?? 7} />
        </CardContent>
      </Card>

      {/* Exportación */}
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

      {/* Notificaciones */}
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

      {/* Preferencias regionales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferencias regionales</CardTitle>
        </CardHeader>
        <CardContent>
          <RegionalSettingsSection
            currency={org?.currency ?? "EUR"}
            timezone={org?.timezone ?? "Europe/Madrid"}
            fiscalYearStart={org?.fiscalYearStart ?? 1}
            dateFormat={org?.dateFormat ?? "dd/MM/yyyy"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
