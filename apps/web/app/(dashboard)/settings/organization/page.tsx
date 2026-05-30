import { redirect } from "next/navigation"
import { OrganizationForm } from "@/features/settings/components/organization-form"
import { getOrganizationSettings } from "@/features/settings/queries/get-organization-settings"

export default async function OrganizationSettingsPage() {
  const organization = await getOrganizationSettings()

  if (!organization) {
    redirect("/settings")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-2xl">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  )
}
