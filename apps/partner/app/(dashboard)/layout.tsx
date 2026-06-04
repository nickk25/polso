import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { AppSidebar } from "@/components/layout/sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { AuthCallbackRedirect } from "@/components/auth-callback-redirect"

async function getExistingPartnerOrg(userId: string) {
  const found = await prisma.userOrganization.findFirst({
    where: { userId, organization: { type: "partner" } },
    include: { organization: true },
  })
  return found?.organization ?? null
}

// Kept for when PUBLIC_SIGNUP_ENABLED="true" — do not remove
async function getOrCreatePartnerOrg(userId: string, userEmail: string | null, userName?: string | null, userImage?: string | null) {
  const existing = await prisma.userOrganization.findFirst({
    where: { userId, organization: { type: "partner" } },
    include: { organization: true },
  })

  if (existing) return existing.organization

  try {
    return await prisma.$transaction(async (tx) => {
      const doubleCheck = await tx.userOrganization.findFirst({
        where: { userId, organization: { type: "partner" } },
        include: { organization: true },
      })

      if (doubleCheck) return doubleCheck.organization

      return tx.organization.create({
        data: {
          name: userEmail
            ? `${userEmail.split("@")[0]}'s Asesoría`
            : "Mi Asesoría",
          type: "partner",
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
      })
    })
  } catch {
    const created = await prisma.userOrganization.findFirst({
      where: { userId, organization: { type: "partner" } },
      include: { organization: true },
    })
    if (created) return created.organization
    throw new Error("Failed to create organization")
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await neonAuth()

  if (!user) redirect("/auth/sign-in")

  const org = process.env.PUBLIC_SIGNUP_ENABLED === "true"
    ? await getOrCreatePartnerOrg(user.id, user.email, user.name, user.image)
    : await getExistingPartnerOrg(user.id)

  if (!org) redirect("/not-partner")

  return (
    <div className="relative">
      <AuthCallbackRedirect />
      <AppSidebar
        organizationName={org.name}
        organizationId={org.id}
        userEmail={user.email}
        hasLogo={!!org.logoFilePath}
      />
      <div className="md:ml-[70px] min-h-screen flex flex-col">
        <header className="h-14 shrink-0 border-b flex items-center px-4 md:px-0">
          <DashboardHeader
            organizationName={org.name}
            userEmail={user.email}
            userImage={user.image ?? null}
          />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
