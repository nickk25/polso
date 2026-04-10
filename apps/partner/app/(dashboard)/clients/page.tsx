import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getClientList } from "@/features/clients/queries/get-client-list"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { Button } from "@polso/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { UserPlus } from "@phosphor-icons/react/dist/ssr"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function ClientsPage() {
  const ctx = await getPartnerAuthContext()
  const clients = await getClientList(ctx.organizationId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-muted-foreground text-sm">Gestiona y supervisa tus clientes autónomos</p>
      </div>

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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No tienes clientes todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Invita a tus clientes para que conecten su banco y ver sus datos aquí.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/invite">Invitar primer cliente</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recibos sin match</TableHead>
                <TableHead>Último sync</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.clientId}`} className="hover:underline">
                      {client.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ClientStatusBadge status={client.status} />
                  </TableCell>
                  <TableCell>
                    {client.status === "active" ? (
                      <span
                        className={
                          client.unmatchedInbox > 0
                            ? "font-medium text-orange-600"
                            : "text-muted-foreground"
                        }
                      >
                        {client.unmatchedInbox}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {client.lastSyncedAt
                      ? formatDistanceToNow(client.lastSyncedAt, {
                          addSuffix: true,
                          locale: es,
                        })
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/clients/${client.clientId}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
