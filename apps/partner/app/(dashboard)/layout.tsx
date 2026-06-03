import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { getPartnerAuthContext } from "@/lib/auth"
import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@polso/ui/sidebar"
import { Separator } from "@polso/ui/separator"

async function getOrCreatePartnerOrg(userId: string, userEmail: string | null) {
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
            create: { userId, role: "owner" },
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

  const org = await getOrCreatePartnerOrg(user.id, user.email)

  if (org.type !== "partner") redirect("/not-partner")

  return (
    <SidebarProvider>
      <AppSidebar
        organizationName={org.name}
        organizationId={org.id}
        userEmail={user.email}
        hasLogo={!!org.logoFilePath}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 my-auto" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
