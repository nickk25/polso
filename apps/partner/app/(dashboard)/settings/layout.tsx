import { SettingsTabs } from "@/features/settings/components/settings-tabs"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <SettingsTabs />
      <div className="flex-1">{children}</div>
    </div>
  )
}
