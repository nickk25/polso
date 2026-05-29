"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Buildings, Bank, Bell, Gear, UsersThree, Robot } from "@phosphor-icons/react"

const TABS = [
  { label: "Profile", href: "/settings/profile", Icon: User },
  { label: "Organization", href: "/settings/organization", Icon: Buildings },
  { label: "Banking", href: "/settings/banking", Icon: Bank },
  { label: "Team", href: "/settings/team", Icon: UsersThree },
  { label: "Notifications", href: "/settings/notifications", Icon: Bell },
  { label: "Preferences", href: "/settings/preferences", Icon: Gear },
  { label: "Agent", href: "/settings/agent", Icon: Robot },
]

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-0 px-6 overflow-x-auto">
        {TABS.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
