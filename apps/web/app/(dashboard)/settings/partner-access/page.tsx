import { PartnerAccessList } from "@/features/settings/components/partner-access-list"
import { getPartnerAccess } from "@/features/settings/queries/get-partner-access"

export default async function PartnerAccessPage() {
  const partners = await getPartnerAccess()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-6 max-w-4xl">
        <PartnerAccessList partners={partners} />
      </div>
    </div>
  )
}
