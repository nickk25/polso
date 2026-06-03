"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Buildings, UsersThree, Sliders, Bell, Globe } from "@phosphor-icons/react"

const TABS = [
  { label: "Perfil", href: "/settings/perfil", icon: User },
  { label: "Asesoría", href: "/settings", icon: Buildings },
  { label: "Equipo", href: "/settings/equipo", icon: UsersThree },
  { label: "Preferencias", href: "/settings/preferencias", icon: Sliders },
  { label: "Notificaciones", href: "/settings/notificaciones", icon: Bell },
  { label: "Regional", href: "/settings/regional", icon: Globe },
] as const

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="bg-background sticky top-0 z-10 border-b">
      <div className="flex items-center gap-0 px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/settings"
            ? pathname === "/settings"
            : pathname === href || pathname.startsWith(href + "/")
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
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
