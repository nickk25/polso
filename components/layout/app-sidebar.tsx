"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChartLine,
  Bank,
  Receipt,
  Repeat,
  Buildings,
  Tag,
  Export,
  Gear,
  House,
} from "@phosphor-icons/react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

const mainNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: House,
  },
  {
    title: "Banking",
    href: "/banking",
    icon: Bank,
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: Receipt,
  },
  {
    title: "Recurring",
    href: "/recurring",
    icon: Repeat,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: ChartLine,
  },
]

const manageNavItems = [
  {
    title: "Vendors",
    href: "/vendors",
    icon: Buildings,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tag,
  },
  {
    title: "Export",
    href: "/export",
    icon: Export,
  },
]

const settingsNavItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Gear,
  },
]

interface AppSidebarProps {
  organizationName: string
  userEmail: string | null
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

export function AppSidebar({ organizationName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const initials = getInitials(organizationName)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
            P
          </div>
          <span className="text-sm font-semibold">Polso</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px]">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    className="h-8 text-xs"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px]">Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-8 text-xs"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {settingsNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="h-8 text-xs"
              >
                <Link href={item.href}>
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="px-2 py-3 border-t mt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{organizationName}</span>
              {userEmail && (
                <span className="text-[10px] text-muted-foreground truncate">{userEmail}</span>
              )}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
