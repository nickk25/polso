"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Bell } from "@phosphor-icons/react"
import { MobileNav } from "./mobile-nav"
import { UserMenu } from "./user-menu"

const PATH_MAP: Record<string, string> = {
  "/dashboard": "overview",
  "/transactions": "transactions",
  "/categories": "categories",
  "/recurring": "recurring",
  "/reports": "reports",
  "/vault": "vault",
  "/counterparties": "vendors",
  "/alerts": "alerts",
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
  userEmail: string | null
  userImage: string | null
  unreadAlertCount: number
}

export function DashboardHeader({ organizationName, userName, userEmail, userImage, unreadAlertCount }: DashboardHeaderProps) {
  const pathname = usePathname()
  const t = useTranslations("common")
  const key = getTitleKey(pathname)

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center">
        <div className="md:hidden">
          <MobileNav organizationName={organizationName} />
        </div>
        {key && (
          <span className="text-sm font-semibold ml-3 md:ml-6 truncate">
            {t(`navigation.${key}`)}
          </span>
        )}
      </div>
      <div className="pr-4 md:pr-6 flex items-center gap-2">
        <Link href="/alerts" className="relative flex h-8 w-8 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-muted">
          <Bell className="h-4 w-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
          )}
        </Link>
        <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </div>
    </div>
  )
}
