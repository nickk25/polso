"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  House,
  ArrowsLeftRight,
  Repeat,
  ChartLine,
  Vault,
  Buildings,
  Tag,
  Export,
  Gear,
  Bell,
  CaretDown,
} from "@phosphor-icons/react";

export interface NavChild {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number }>;
  children?: NavChild[];
}

// Sidebar geometry — all magic pixel values derive from this system:
//   collapsed: 70px  |  expanded: 240px
//   icon x-offset: 15px  |  icon touch target: 40×40px
//   label x-start: 63px = 15 + 40 + 8gap
//   child indent: 55px = 15 + 40  |  footer avatar: left-19 / 32×32px
//   If collapsed width changes, update w-[70px], w-[69px], md:ml-[70px] in layout together.
export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", labelKey: "overview", icon: House },
  {
    path: "/transactions",
    labelKey: "transactions",
    icon: ArrowsLeftRight,
    children: [
      { path: "/categories", labelKey: "categories", icon: Tag },
      { path: "/recurring", labelKey: "recurring", icon: Repeat },
    ],
  },
  { path: "/reports", labelKey: "reports", icon: ChartLine },
  { path: "/vault", labelKey: "vault", icon: Vault },
  { path: "/counterparties", labelKey: "vendors", icon: Buildings },
  { path: "/alerts", labelKey: "alerts", icon: Bell },
  { path: "/export", labelKey: "export", icon: Export },
  { path: "/settings", labelKey: "settings", icon: Gear },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface AppSidebarProps {
  organizationName: string;
}

export function AppSidebar({ organizationName }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(NAV_ITEMS.filter((item) => item.children).map((item) => item.path)),
  );
  const initials = getInitials(organizationName);

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
          "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] h-18",
          isExpanded ? "w-full" : "w-[69px]",
        )}
      >
        <Link
          href="/dashboard"
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
          Polso
        </span>
      </div>

      {/* Nav */}
      <div className="flex flex-col w-full pt-18 flex-1 border-b border-border mb-3">
        <nav className="mt-4 w-full">
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.path ||
                    pathname.startsWith(item.path + "/") ||
                    (item.children?.some(
                      (c) =>
                        pathname === c.path ||
                        pathname.startsWith(c.path + "/"),
                    ) ?? false);
              const isItemExpanded = expandedItems.has(item.path);
              const showChildren = isExpanded && isItemExpanded;

              return (
                <div key={item.path}>
                  <div className="group relative">
                    <Link href={item.path} className="block">
                      <div className="relative">
                        {/* Highlight background */}
                        <div
                          className={cn(
                            "h-[40px] ml-[15px] mr-[15px]",
                            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                            isActive
                              ? "bg-[#f2f2f2] dark:bg-[#131313] border border-[#e0e0e0] dark:border-[#1d1d1d]"
                              : "group-hover:bg-[#f7f7f7] dark:group-hover:bg-[#131313]/60",
                            isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]",
                          )}
                        />
                        {/* Icon */}
                        <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center text-foreground/70 group-hover:text-foreground pointer-events-none transition-colors">
                          <Icon size={20} />
                        </div>
                        {/* Label */}
                        <div
                          className={cn(
                            "absolute top-0 left-[63px] right-[40px] h-[40px] flex items-center pointer-events-none",
                            "transition-opacity duration-150",
                            isExpanded ? "opacity-100" : "opacity-0",
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-medium whitespace-nowrap overflow-hidden text-foreground/60 group-hover:text-foreground transition-colors",
                              isActive && "text-foreground",
                            )}
                          >
                            {t(`navigation.${item.labelKey}`)}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Chevron for items with children */}
                    {item.children && isExpanded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedItems((prev) => {
                            const next = new Set(prev);
                            isItemExpanded ? next.delete(item.path) : next.add(item.path);
                            return next;
                          });
                        }}
                        className={cn(
                          "absolute top-[4px] right-[19px] w-8 h-8 flex items-center justify-center",
                          "text-foreground/40 hover:text-foreground transition-all duration-200",
                          isItemExpanded && "rotate-180",
                        )}
                      >
                        <CaretDown size={14} />
                      </button>
                    )}
                  </div>

                  {/* Sub-items */}
                  {item.children && (
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-out",
                        showChildren ? "max-h-40" : "max-h-0",
                      )}
                    >
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive =
                          pathname === child.path ||
                          pathname.startsWith(child.path + "/");
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            className="group/child block"
                          >
                            <div className="ml-[55px] mr-[15px] h-[32px] flex items-center gap-2 border-l border-[#e6e6e6]! dark:border-[#1d1d1d]! pl-3">
                              <ChildIcon size={14} />
                              <span
                                className={cn(
                                  "text-xs font-medium whitespace-nowrap overflow-hidden text-foreground/50 group-hover/child:text-foreground transition-colors",
                                  isChildActive && "text-foreground",
                                )}
                              >
                                {t(`navigation.${child.labelKey}`)}
                              </span>
                            </div>
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
      </div>

      {/* Footer — org name only */}
      <div className="relative h-[40px] w-full flex items-center">
        <div className="absolute left-[19px] w-[32px] h-[32px] flex items-center justify-center shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs">
            {initials}
          </div>
        </div>
        <span
          className={cn(
            "absolute left-[60px] right-[15px] text-sm font-medium truncate text-left text-muted-foreground",
            "transition-opacity duration-150",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {organizationName}
        </span>
      </div>
    </aside>
  );
}
