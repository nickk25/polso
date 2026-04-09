import { redirect } from "next/navigation"
import { SettingsHeader } from "@/features/settings/components/settings-header"
import { OrganizationForm } from "@/features/settings/components/organization-form"
import { getOrganizationSettings } from "@/features/settings/queries/get-organization-settings"
import { getTranslations } from "next-intl/server"

export default async function OrganizationSettingsPage() {
  const t = await getTranslations("settings")
  const organization = await getOrganizationSettings()

  if (!organization) {
    redirect("/settings")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title={t("organizationPage.title")}
        description={t("organizationPage.description")}
      />
      <div className="max-w-2xl">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  )
}
