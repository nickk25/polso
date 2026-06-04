"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { User, Buildings, Bank, Bell, Gear, UsersThree, Robot, Handshake } from "@phosphor-icons/react"

const TABS = [
  { key: "profile", href: "/settings/profile", Icon: User },
  { key: "organization", href: "/settings/organization", Icon: Buildings },
  { key: "banking", href: "/settings/banking", Icon: Bank },
  { key: "team", href: "/settings/team", Icon: UsersThree },
  { key: "notifications", href: "/settings/notifications", Icon: Bell },
  { key: "preferences", href: "/settings/preferences", Icon: Gear },
  { key: "agent", href: "/settings/agent", Icon: Robot },
  { key: "partnerAccess", href: "/settings/partner-access", Icon: Handshake },
] as const

export function SettingsTabs() {
  const t = useTranslations("settings.tabs")
  const pathname = usePathname()

  return (
    <div className="bg-background sticky top-0 z-10 border-b">
      <div className="flex items-center gap-0 px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map(({ key, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(key)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
