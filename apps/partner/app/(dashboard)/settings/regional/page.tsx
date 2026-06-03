import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { RegionalSettingsSection } from "@/features/settings/components/regional-settings-section"

export default async function RegionalPage() {
  const ctx = await getPartnerAuthContext()

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      currency: true,
      fiscalYearStart: true,
      dateFormat: true,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferencias regionales</CardTitle>
        </CardHeader>
        <CardContent>
          <RegionalSettingsSection
            currency={org?.currency ?? "EUR"}
            fiscalYearStart={org?.fiscalYearStart ?? 1}
            dateFormat={org?.dateFormat ?? "dd/MM/yyyy"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
