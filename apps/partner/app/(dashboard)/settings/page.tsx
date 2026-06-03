import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Separator } from "@polso/ui/separator"
import { OrganizationProfileSection } from "@/features/settings/components/organization-profile-section"
import { OrganizationLogoSection } from "@/features/settings/components/organization-logo-section"

export default async function SettingsPage() {
  const ctx = await getPartnerAuthContext()

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true,
      taxId: true,
      address: true,
      contactEmail: true,
      logoFilePath: true,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
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
    </div>
  )
}
