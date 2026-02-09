import { SettingsHeader } from "@/features/settings/components/settings-header"
import { PreferencesForm } from "@/features/settings/components/preferences-form"
import { getUserPreferences } from "@/features/settings/queries/get-user-preferences"
import { getTranslations } from "next-intl/server"

export default async function PreferencesPage() {
  const t = await getTranslations("settings")
  const preferences = await getUserPreferences()

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title={t("preferencesPage.title")}
        description={t("preferencesPage.description")}
      />
      <div className="max-w-2xl">
        <PreferencesForm preferences={preferences} />
      </div>
    </div>
  )
}
