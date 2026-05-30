"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, getInitials } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@polso/ui/sheet";
import { List } from "@phosphor-icons/react";
import { NAV_ITEMS } from "./app-sidebar";
import type { NavItem } from "./app-sidebar";

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.path === "/dashboard") return pathname === "/dashboard";
  return (
    pathname === item.path ||
    pathname.startsWith(item.path + "/") ||
    (item.children?.some(
      (c) => pathname === c.path || pathname.startsWith(c.path + "/"),
    ) ?? false)
  );
}

interface MobileNavProps {
  organizationName: string;
}

export function MobileNav({ organizationName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <List size={22} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b">
            <SheetTitle className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-sm shrink-0">
                P
              </div>
              <span className="text-sm font-semibold">Polso</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, pathname);
                return (
                  <div key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        active
                          ? "bg-[#f2f2f2] dark:bg-[#131313] text-foreground"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon size={18} />
                      {t(`navigation.${item.labelKey}`)}
                    </Link>

                    {item.children && (
                      <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-border pl-3 mb-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive =
                            pathname === child.path ||
                            pathname.startsWith(child.path + "/");
                          return (
                            <Link
                              key={child.path}
                              href={child.path}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-2 py-1.5 text-xs font-medium transition-colors",
                                childActive
                                  ? "text-foreground"
                                  : "text-foreground/50 hover:text-foreground",
                              )}
                            >
                              <ChildIcon size={13} />
                              {t(`navigation.${child.labelKey}`)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs shrink-0">
                {getInitials(organizationName)}
              </div>
              <p className="text-sm font-medium truncate">{organizationName}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
