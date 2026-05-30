import { PreferencesForm } from "@/features/settings/components/preferences-form"
import { getUserPreferences } from "@/features/settings/queries/get-user-preferences"

export default async function PreferencesPage() {
  const preferences = await getUserPreferences()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-2xl">
        <PreferencesForm preferences={preferences} />
      </div>
    </div>
  )
}
