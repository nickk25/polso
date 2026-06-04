import { redirect } from "next/navigation";
import { neonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AuthCallbackRedirect } from "@/components/auth-callback-redirect";
import { SyncMonitor } from "@/features/banking/components/sync-monitor";

async function getOrganization(userId: string, userEmail: string | null, userName?: string | null, userImage?: string | null) {
  // Check if user has an organization
  const existingOrg = await prisma.userOrganization.findFirst({
    where: { userId, organization: { type: "client" } },
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
        where: { userId, organization: { type: "client" } },
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
              memberName: userName ?? null,
              memberEmail: userEmail ?? null,
              memberImage: userImage ?? null,
            },
          },
        },
      });
    });

    return org;
  } catch {
    // If transaction failed due to race condition, fetch the org that was created
    const created = await prisma.userOrganization.findFirst({
      where: { userId, organization: { type: "client" } },
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
  const organization = await getOrganization(user.id, user.email, user.name, user.image);

  if (!organization.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const unreadAlertCount = await prisma.alert.count({
    where: { organizationId: organization.id, isDismissed: false, isRead: false },
  });

  return (
    <div className="relative">
      <AuthCallbackRedirect />
      <SyncMonitor />
      <AppSidebar organizationName={organization.name} />
      <div className="md:ml-[70px] min-h-screen flex flex-col">
        <header className="h-14 md:h-18 shrink-0 border-b flex items-center px-4 md:px-0">
          <DashboardHeader
            organizationName={organization.name}
            userName={user.name ?? user.email?.split("@")[0] ?? ""}
            userEmail={user.email ?? null}
            userImage={user.image ?? null}
            unreadAlertCount={unreadAlertCount}
          />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
