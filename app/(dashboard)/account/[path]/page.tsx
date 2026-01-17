import { AccountView } from "@neondatabase/auth/react"
import { accountViewPaths } from "@neondatabase/auth/react/ui/server"
import { SettingsHeader } from "@/features/settings/components/settings-header"

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }))
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params

  const titles: Record<string, string> = {
    settings: "Profile Settings",
    security: "Security Settings",
    sessions: "Active Sessions",
    teams: "Teams",
    passkeys: "Passkeys",
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title={titles[path] || "Account"}
        description="Manage your account settings"
      />
      <div className="max-w-5xl">
        <AccountView path={path} />
      </div>
    </div>
  )
}
