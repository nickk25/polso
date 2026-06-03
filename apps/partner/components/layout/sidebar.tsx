"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { House, Buildings, Gear } from "@phosphor-icons/react"
import { cn } from "@polso/utils/cn"
import { getInitials } from "@/lib/format"

const NAV_ITEMS = [
  { path: "/", label: "Resumen", icon: House },
  { path: "/clients", label: "Clientes", icon: Buildings },
  { path: "/settings", label: "Configuración", icon: Gear },
]

function isActive(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(path + "/")
}

interface AppSidebarProps {
  organizationName: string
  organizationId: string
  userEmail: string | null
  hasLogo?: boolean
}

export function AppSidebar({ organizationName, organizationId, hasLogo = false }: AppSidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const showLogo = hasLogo && !logoError
  const initials = getInitials(organizationName)

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex-col justify-between fixed top-0 left-0 pb-4 hidden md:flex z-50",
        "bg-background border-r border-border overflow-hidden",
        "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isExpanded ? "w-[240px]" : "w-[70px]",
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo header */}
      <div
        className={cn(
          "absolute top-0 left-0 flex items-center bg-background border-b border-border",
          "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] h-14",
          isExpanded ? "w-full" : "w-[69px]",
        )}
      >
        <Link
          href="/"
          className="absolute left-[15px] w-[40px] h-[40px] flex items-center justify-center"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-sm shrink-0">
            P
          </div>
        </Link>
        <span
          className={cn(
            "absolute left-[63px] text-sm font-semibold whitespace-nowrap transition-opacity duration-150",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          Polso Partner
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col w-full pt-14 flex-1 border-b border-border mb-3">
        <nav className="mt-4 w-full">
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path, pathname)

              return (
                <div key={item.path} className="group relative">
                  <Link href={item.path} className="block">
                    <div className="relative">
                      <div
                        className={cn(
                          "h-[40px] ml-[15px] mr-[15px]",
                          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          active
                            ? "bg-[#f2f2f2] border border-[#e0e0e0]"
                            : "group-hover:bg-[#f7f7f7]",
                          isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]",
                        )}
                      />
                      <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center text-foreground/70 group-hover:text-foreground pointer-events-none transition-colors">
                        <Icon size={20} />
                      </div>
                      <div
                        className={cn(
                          "absolute top-0 left-[63px] right-[15px] h-[40px] flex items-center pointer-events-none",
                          "transition-opacity duration-150",
                          isExpanded ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm font-medium whitespace-nowrap overflow-hidden text-foreground/60 group-hover:text-foreground transition-colors",
                            active && "text-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="relative h-[40px] w-full flex items-center">
        <div className="absolute left-[19px]">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted text-muted-foreground font-semibold text-xs overflow-hidden">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/org-logo/${organizationId}`}
                alt=""
                className="h-full w-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              initials
            )}
          </div>
        </div>
        <div
          className={cn(
            "absolute left-[60px] right-[15px] transition-opacity duration-150",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <span className="text-sm font-medium truncate text-muted-foreground">
            {organizationName}
          </span>
        </div>
      </div>
    </aside>
  )
}
