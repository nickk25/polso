import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Buildings, ArrowsClockwise, FileText, Warning } from "@phosphor-icons/react/dist/ssr"

async function getOverviewStats(organizationId: string) {
  const [activeClients, pendingClients, unmatchedInbox] = await Promise.all([
    prisma.partnerClient.count({
      where: { partnerId: organizationId, status: "active" },
    }),
    prisma.partnerClient.count({
      where: { partnerId: organizationId, status: "pending" },
    }),
    // Count inbox items with no match across all clients
    prisma.inboxItem.count({
      where: {
        organization: {
          partnerLinks: {
            some: { partnerId: organizationId, status: "active" },
          },
        },
        status: { in: ["new", "no_match"] },
      },
    }),
  ])

  return { activeClients, pendingClients, unmatchedInbox }
}

export default async function DashboardPage() {
  const ctx = await getPartnerAuthContext()
  const stats = await getOverviewStats(ctx.organizationId)

  return (
    <div className="flex flex-col gap-6 p-6">
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes activos</CardTitle>
            <Buildings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeClients}</p>
            {stats.pendingClients > 0 && (
              <p className="text-xs text-muted-foreground">
                {stats.pendingClients} pendiente{stats.pendingClients > 1 ? "s" : ""} de conectar
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibos sin match</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.unmatchedInbox}</p>
            <p className="text-xs text-muted-foreground">Pendientes de conciliar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado sync</CardTitle>
            <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">OK</p>
            <p className="text-xs text-muted-foreground">Todos los bancos activos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
