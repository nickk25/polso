import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getClientList } from "@/features/clients/queries/get-client-list"
import { Button } from "@polso/ui/button"
import { Card, CardContent } from "@polso/ui/card"
import { UserPlus, Buildings, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr"
import { ClientListTable } from "@/components/clients/client-list-table"

export default async function ClientsPage() {
  const ctx = await getPartnerAuthContext()
  const clients = await getClientList(ctx.organizationId)

  const activeCount = clients.filter((c) => c.status === "active").length
  const pendingCount = clients.filter((c) => c.status === "pending").length
  const inboxCount = clients.filter((c) => c.unmatchedInbox > 0).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {clients.length} cliente{clients.length !== 1 ? "s" : ""}
        </p>
        <Button asChild size="sm">
          <Link href="/invite">
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar cliente
          </Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Buildings className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No tienes clientes todavía</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invita a tus clientes para que conecten su banco y ver sus datos aquí.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/invite">Invitar primer cliente</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">activos</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">invitaciones pendientes</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${inboxCount > 0 ? "text-orange-500" : ""}`}>
                      {inboxCount}
                    </p>
                    <p className="text-xs text-muted-foreground">con bandeja pendiente</p>
                  </div>
                  <Buildings className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <ClientListTable clients={clients} />
        </>
      )}
    </div>
  )
}
