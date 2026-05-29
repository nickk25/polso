"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  House,
  ArrowsLeftRight,
  Repeat,
  ChartLine,
  Vault,
  Buildings,
  Users,
  Tag,
  Export,
  Gear,
} from "@phosphor-icons/react";

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@polso/ui/sidebar";

interface AppSidebarProps {
  organizationName: string;
  userEmail: string | null;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function AppSidebar({ organizationName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const initials = getInitials(organizationName);

  const isTransactionsActive =
    pathname === "/transactions" ||
    pathname.startsWith("/transactions/") ||
    pathname === "/categories";

  return (
    <Sidebar>
      <SidebarHeader className="h-12 border-b px-4 justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
            P
          </div>
          <span className="text-sm font-semibold">Polso</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  className="h-8 text-xs"
                >
                  <Link href="/dashboard">
                    <House className="h-3.5 w-3.5" />
                    <span>{t("navigation.overview")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Transactions + Categories sub-item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isTransactionsActive}
                  className="h-8 text-xs"
                >
                  <Link href="/transactions">
                    <ArrowsLeftRight className="h-3.5 w-3.5" />
                    <span>{t("navigation.transactions")}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === "/categories"}
                      className="text-xs"
                    >
                      <Link href="/categories">
                        <Tag className="h-3 w-3" />
                        <span>{t("navigation.categories")}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              {/* Recurring */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/recurring" || pathname.startsWith("/recurring/")}
                  className="h-8 text-xs"
                >
                  <Link href="/recurring">
                    <Repeat className="h-3.5 w-3.5" />
                    <span>{t("navigation.recurring")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Reports */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/reports" || pathname.startsWith("/reports/")}
                  className="h-8 text-xs"
                >
                  <Link href="/reports">
                    <ChartLine className="h-3.5 w-3.5" />
                    <span>{t("navigation.reports")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Vault */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/vault" || pathname.startsWith("/vault/")}
                  className="h-8 text-xs"
                >
                  <Link href="/vault">
                    <Vault className="h-3.5 w-3.5" />
                    <span>{t("navigation.vault")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px]">{t("navigation.manage")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/vendors" || pathname.startsWith("/vendors/")}
                  className="h-8 text-xs"
                >
                  <Link href="/vendors">
                    <Buildings className="h-3.5 w-3.5" />
                    <span>{t("navigation.vendors")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/customers" || pathname.startsWith("/customers/")}
                  className="h-8 text-xs"
                >
                  <Link href="/customers">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t("navigation.customers")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/export"}
                  className="h-8 text-xs"
                >
                  <Link href="/export">
                    <Export className="h-3.5 w-3.5" />
                    <span>{t("navigation.export")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/settings" || pathname.startsWith("/settings/")}
              className="h-8 text-xs"
            >
              <Link href="/settings">
                <Gear className="h-3.5 w-3.5" />
                <span>{t("navigation.settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-3 border-t mt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground font-semibold text-xs">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">
                {organizationName}
              </span>
              {userEmail && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {userEmail}
                </span>
              )}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
