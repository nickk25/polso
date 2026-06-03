import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { AppSidebar } from "@/components/layout/sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"

async function getOrCreatePartnerOrg(userId: string, userEmail: string | null, userName?: string | null, userImage?: string | null) {
  const existing = await prisma.userOrganization.findFirst({
    where: { userId },
    include: { organization: true },
  })

  if (existing) return existing.organization

  try {
    return await prisma.$transaction(async (tx) => {
      const doubleCheck = await tx.userOrganization.findFirst({
        where: { userId },
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
      where: { userId },
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

  const org = await getOrCreatePartnerOrg(user.id, user.email, user.name, user.image)

  if (org.type !== "partner") redirect("/not-partner")

  return (
    <div className="relative">
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
