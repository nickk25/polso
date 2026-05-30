import { NotificationsForm } from "@/features/settings/components/notifications-form"
import { getNotificationSettings } from "@/features/settings/queries/get-notification-settings"

export default async function NotificationsPage() {
  const settings = await getNotificationSettings()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-2xl">
        <NotificationsForm settings={settings} />
      </div>
    </div>
  )
}
