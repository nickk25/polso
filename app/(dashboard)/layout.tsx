import { redirect } from "next/navigation";
import { neonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/db";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";

async function getOrganization(userId: string, userEmail: string | null) {
  // Check if user has an organization
  const existingOrg = await prisma.userOrganization.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (existingOrg) {
    return existingOrg.organization;
  }

  // Use transaction to prevent race condition on first login
  // Multiple parallel requests might try to create an org simultaneously
  try {
    const org = await prisma.$transaction(async (tx) => {
      // Double-check inside transaction
      const existing = await tx.userOrganization.findFirst({
        where: { userId },
        include: { organization: true },
      });

      if (existing) {
        return existing.organization;
      }

      // Create new organization
      return tx.organization.create({
        data: {
          name: userEmail
            ? `${userEmail.split("@")[0]}'s Organization`
            : "My Organization",
          userOrganizations: {
            create: {
              userId,
              role: "owner",
            },
          },
        },
      });
    });

    return org;
  } catch {
    // If transaction failed due to race condition, fetch the org that was created
    const created = await prisma.userOrganization.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (created) {
      return created.organization;
    }

    throw new Error("Failed to create organization");
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await neonAuth();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Get or create user's organization
  const organization = await getOrganization(user.id, user.email);

  return (
    <SidebarProvider>
      <AppSidebar organizationName={organization.name} userEmail={user.email} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 my-auto" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
