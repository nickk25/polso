"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Buildings,
  ChartBar,
  Gear,
  UserPlus,
  House,
} from "@phosphor-icons/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@polso/ui/sidebar"

const mainNavItems = [
  { label: "Resumen", href: "/", icon: House },
  { label: "Clientes", href: "/clients", icon: Buildings },
]

const toolsNavItems = [
  { label: "Invitar cliente", href: "/invite", icon: UserPlus },
  { label: "Configuración", href: "/settings", icon: Gear },
]

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.charAt(0).toUpperCase()
}

interface AppSidebarProps {
  organizationName: string
  userEmail: string | null
}

export function AppSidebar({ organizationName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const initials = getInitials(organizationName)

  return (
    <Sidebar>
      <SidebarHeader className="h-12 border-b px-4 justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
            P
          </div>
          <span className="text-sm font-semibold">Polso Partner</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(item.href + "/")
                    }
                    className="h-8 text-xs"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px]">Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-8 text-xs"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="px-2 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs shrink-0">
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
