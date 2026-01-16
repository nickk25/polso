import { redirect } from "next/navigation"
import { neonAuth } from "@neondatabase/auth/next/server"
import { prisma } from "@/lib/db"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"

async function ensureOrganization(userId: string, userEmail: string | null) {
  // Check if user has an organization
  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId },
  })

  if (userOrg) {
    return userOrg.organizationId
  }

  // Create a new organization for the user
  const org = await prisma.organization.create({
    data: {
      name: userEmail ? `${userEmail.split("@")[0]}'s Organization` : "My Organization",
      userOrganizations: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
  })

  return org.id
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await neonAuth()

  if (!user) {
    redirect("/auth/sign-in")
  }

  // Ensure user has an organization
  await ensureOrganization(user.id, user.email)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
