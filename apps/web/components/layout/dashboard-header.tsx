"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { MobileNav } from "./mobile-nav"

const PATH_MAP: Record<string, string> = {
  "/dashboard": "overview",
  "/transactions": "transactions",
  "/categories": "categories",
  "/recurring": "recurring",
  "/reports": "reports",
  "/vault": "vault",
  "/counterparties": "vendors",
  "/export": "export",
  "/settings/profile": "profile",
  "/settings/organization": "organization",
  "/settings/banking": "banking",
  "/settings/team": "team",
  "/settings/notifications": "notifications",
  "/settings/preferences": "preferences",
  "/settings/agent": "agent",
  "/settings": "settings",
}

function getTitleKey(pathname: string): string | null {
  const match = Object.keys(PATH_MAP)
    .filter(p => pathname === p || pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PATH_MAP[match] : null
}

interface DashboardHeaderProps {
  organizationName: string
  userName: string
}

export function DashboardHeader({ organizationName, userName }: DashboardHeaderProps) {
  const pathname = usePathname()
  const t = useTranslations("common")
  const key = getTitleKey(pathname)

  return (
    <>
      <div className="md:hidden">
        <MobileNav organizationName={organizationName} userName={userName} />
      </div>
      {key && (
        <span className="text-sm font-semibold ml-3 md:ml-6 truncate">
          {t(`navigation.${key}`)}
        </span>
      )}
    </>
  )
}
