import { redirect } from "next/navigation";
import { neonAuth } from "@neondatabase/auth/next/server";
import { prisma } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AuthCallbackRedirect } from "@/components/auth-callback-redirect";
import { SyncMonitor } from "@/features/banking/components/sync-monitor";
import { needsConsent } from "@/features/auth/queries/get-consent-status";

async function getExistingOrganization(userId: string) {
  const found = await prisma.userOrganization.findFirst({
    where: { userId, organization: { type: "client" } },
    include: { organization: true },
  });
  return found?.organization ?? null;
}

// Kept for when PUBLIC_SIGNUP_ENABLED="true" — do not remove
async function getOrCreateOrganization(userId: string, userEmail: string | null, userName?: string | null, userImage?: string | null) {
  const existingOrg = await prisma.userOrganization.findFirst({
    where: { userId, organization: { type: "client" } },
    include: { organization: true },
  });

  if (existingOrg) {
    return existingOrg.organization;
  }

  try {
    const org = await prisma.$transaction(async (tx) => {
      const existing = await tx.userOrganization.findFirst({
        where: { userId, organization: { type: "client" } },
        include: { organization: true },
      });

      if (existing) {
        return existing.organization;
      }

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

  const organization = process.env.PUBLIC_SIGNUP_ENABLED === "true"
    ? await getOrCreateOrganization(user.id, user.email, user.name, user.image)
    : await getExistingOrganization(user.id);

  if (!organization) {
    redirect("/auth/no-access");
  }

  if (await needsConsent(user.id)) {
    redirect("/onboarding/consent");
  }

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
