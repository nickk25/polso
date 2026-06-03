import Link from "next/link"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { Button } from "@polso/ui/button"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr"
import { ExportForm } from "@/components/export/export-form"

export default async function ClientExportPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()
  const partnerOrg = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { csvSeparator: true, defaultExportRange: true },
  })

  return (
    <div className="flex flex-col gap-6 p-6">

      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>
      <ExportForm
        clientId={clientId}
        separator={partnerOrg?.csvSeparator ?? ";"}
        defaultExportRange={partnerOrg?.defaultExportRange ?? "month"}
      />
    </div>
  )
}
