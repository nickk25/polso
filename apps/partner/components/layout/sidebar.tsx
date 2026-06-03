"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  Buildings,
  Gear,
  House,
  SignOut,
  DotsThree,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import { authClient } from "@polso/auth/client"

const mainNavItems = [
  { label: "Resumen", href: "/", icon: House },
  { label: "Clientes", href: "/clients", icon: Buildings },
]

const toolsNavItems = [
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initials = getInitials(organizationName)

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut()
      router.replace("/auth/sign-in")
    })
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md p-1 hover:bg-sidebar-accent transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-xs font-medium truncate">{organizationName}</span>
                  {userEmail && (
                    <span className="text-[10px] text-muted-foreground truncate">{userEmail}</span>
                  )}
                </div>
                <DotsThree className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isPending}
                className="text-destructive focus:text-destructive"
              >
                <SignOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
