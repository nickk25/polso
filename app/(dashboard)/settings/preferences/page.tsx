import { SettingsHeader } from "@/features/settings/components/settings-header"
import { PreferencesForm } from "@/features/settings/components/preferences-form"
import { getUserPreferences } from "@/features/settings/queries/get-user-preferences"

export default async function PreferencesPage() {
  const preferences = await getUserPreferences()

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title="Preferences"
        description="Customize your display and application settings"
      />
      <div className="max-w-2xl">
        <PreferencesForm preferences={preferences} />
      </div>
    </div>
  )
}
