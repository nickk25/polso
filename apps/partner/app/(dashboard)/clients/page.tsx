import { getPartnerAuthContext } from "@/lib/auth"
import { getClientList } from "@/features/clients/queries/get-client-list"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Buildings, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr"
import { ClientListTable } from "@/components/clients/client-list-table"
import { InviteClientDialog } from "@/components/clients/invite-client-dialog"
import { BulkInviteClientsDialog } from "@/components/clients/bulk-invite-clients-dialog"

export default async function ClientsPage() {
  const ctx = await getPartnerAuthContext()
  const rows = await getClientList(ctx.organizationId)

  const activeCount = rows.filter((r) => r.kind === "client" && r.status === "active").length
  const pendingCount = rows.filter((r) => r.kind === "invitation" && r.status === "pending").length
  const inboxCount = rows.filter((r) => r.kind === "client" && r.unmatchedInbox > 0).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-end gap-2">
        <BulkInviteClientsDialog />
        <InviteClientDialog />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Buildings className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No tienes clientes todavía</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invita a tus clientes para que conecten su banco y ver sus datos aquí.
            </p>
            <div className="mt-4 flex gap-2">
              <BulkInviteClientsDialog />
              <InviteClientDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes activos</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{activeCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invitaciones pendientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por conciliar</CardTitle>
                <Buildings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${inboxCount > 0 ? "text-orange-500" : ""}`}>
                  {inboxCount}
                </p>
              </CardContent>
            </Card>
          </div>

          <ClientListTable clients={rows} />
        </>
      )}
    </div>
  )
}
