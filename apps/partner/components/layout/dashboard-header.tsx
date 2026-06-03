"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@polso/ui/avatar"
import Link from "next/link"
import { UserCircle, UsersThree, Bell, SignOut } from "@phosphor-icons/react"
import { authClient } from "@polso/auth/client"
import { MobileNav } from "./mobile-nav"
import { getInitials } from "@/lib/format"

const PATH_MAP: Record<string, string> = {
  "/": "Resumen",
  "/clients": "Clientes",
  "/settings": "Configuración",
}

function getTitle(pathname: string): string | null {
  const match = Object.keys(PATH_MAP)
    .filter(p => {
      if (p === "/") return pathname === "/"
      return pathname === p || pathname.startsWith(p + "/")
    })
    .sort((a, b) => b.length - a.length)[0]
  return match ? PATH_MAP[match] : null
}

interface DashboardHeaderProps {
  organizationName: string
  userEmail: string | null
  userImage?: string | null
}

export function DashboardHeader({ organizationName, userEmail, userImage }: DashboardHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const title = getTitle(pathname)
  const initials = getInitials(userEmail?.split("@")[0] ?? organizationName)

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut()
      router.replace("/auth/sign-in")
    })
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center">
        <div className="md:hidden">
          <MobileNav organizationName={organizationName} />
        </div>
        {title && (
          <span className="text-sm font-semibold ml-3 md:ml-6 truncate">{title}</span>
        )}
      </div>
      <div className="pr-4 md:pr-6 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage ?? undefined} alt={userEmail ?? "Usuario"} />
                <AvatarFallback delayMs={0} className="bg-muted text-muted-foreground font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {userEmail && (
              <DropdownMenuLabel className="font-normal">
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </DropdownMenuLabel>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/perfil" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/equipo" className="flex items-center gap-2">
                <UsersThree className="h-4 w-4" />
                Equipo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/notificaciones" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificaciones
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <SignOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
