"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { authClient } from "@polso/auth/client"
import { Avatar, AvatarFallback } from "@polso/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import { User, Sun, Moon, Monitor, SignOut } from "@phosphor-icons/react"
import { getInitials } from "@/lib/utils"

interface UserMenuProps {
  userName: string
  userEmail: string | null
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const THEME_CYCLE: Record<string, { next: string; Icon: React.ElementType; label: string }> = {
    light: { next: "dark", Icon: Moon, label: "Dark" },
    dark:  { next: "system", Icon: Monitor, label: "System" },
    system: { next: "light", Icon: Sun, label: "Light" },
  }
  const { next: nextTheme, Icon: ThemeIcon, label: themeLabel } = THEME_CYCLE[theme ?? "system"]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="outline-none">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px] font-semibold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm">{userName}</span>
            {userEmail && (
              <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(nextTheme)} className="flex items-center gap-2">
          <ThemeIcon className="h-4 w-4" />
          {themeLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={async () => {
            await authClient.signOut()
            router.replace("/auth/sign-in")
          }}
        >
          <SignOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
