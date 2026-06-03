"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@polso/utils/cn"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@polso/ui/sheet"
import { House, Buildings, Gear, List } from "@phosphor-icons/react"

const NAV_ITEMS = [
  { path: "/", label: "Resumen", icon: House },
  { path: "/clients", label: "Clientes", icon: Buildings },
  { path: "/settings", label: "Configuración", icon: Gear },
]

function isActive(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(path + "/")
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.charAt(0).toUpperCase()
}

interface MobileNavProps {
  organizationName: string
}

export function MobileNav({ organizationName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center h-8 w-8 rounded-full border text-foreground hover:bg-muted transition-colors"
        aria-label="Abrir navegación"
      >
        <List size={16} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b">
            <SheetTitle className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-sm shrink-0">
                P
              </div>
              <span className="text-sm font-semibold">Polso Partner</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path, pathname)
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-[#f2f2f2] text-foreground"
                        : "text-foreground/60 hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted text-muted-foreground font-semibold text-xs shrink-0">
                {getInitials(organizationName)}
              </div>
              <span className="text-sm font-medium truncate">{organizationName}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
