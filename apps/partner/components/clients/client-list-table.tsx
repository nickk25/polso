"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { Input } from "@polso/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { ClientStatusBadge } from "./client-status-badge"
import { InvitationActionsMenu } from "./invitation-actions-menu"
import type { PartnerClientRow } from "@/features/clients/queries/get-client-list"

type InboxSort = "none" | "desc" | "asc"
type ContactSort = "none" | "oldest" | "newest"

export function ClientListTable({ clients }: { clients: PartnerClientRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [inboxSort, setInboxSort] = useState<InboxSort>("none")
  const [contactSort, setContactSort] = useState<ContactSort>("none")

  const filtered = useMemo(() => {
    let result = clients

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter((c) => {
        const name = c.kind === "client" ? c.clientName : (c.clientName ?? c.email)
        return name.toLowerCase().includes(q) || (c.kind === "invitation" && c.email.toLowerCase().includes(q))
      })
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (inboxSort !== "none") {
      result = [...result].sort((a, b) => {
        const av = a.kind === "client" ? a.unmatchedInbox : 0
        const bv = b.kind === "client" ? b.unmatchedInbox : 0
        return inboxSort === "desc" ? bv - av : av - bv
      })
    } else if (contactSort !== "none") {
      result = [...result].sort((a, b) => {
        const at = a.kind === "client" ? (a.lastContactedAt?.getTime() ?? 0) : (a.invitedAt.getTime())
        const bt = b.kind === "client" ? (b.lastContactedAt?.getTime() ?? 0) : (b.invitedAt.getTime())
        return contactSort === "oldest" ? at - bt : bt - at
      })
    }

    return result
  }, [clients, query, statusFilter, inboxSort, contactSort])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Conectado</SelectItem>
            <SelectItem value="pending">Invitada</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="disconnected">Desconectado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={inboxSort}
          onValueChange={(v) => {
            setInboxSort(v as InboxSort)
            if (v !== "none") setContactSort("none")
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Por conciliar</SelectItem>
            <SelectItem value="desc">Más primero</SelectItem>
            <SelectItem value="asc">Menos primero</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={contactSort}
          onValueChange={(v) => {
            setContactSort(v as ContactSort)
            if (v !== "none") setInboxSort("none")
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Último contacto</SelectItem>
            <SelectItem value="oldest">Menos reciente</SelectItem>
            <SelectItem value="newest">Más reciente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-32 hidden sm:table-cell">Estado</TableHead>
              <TableHead className="w-24 text-right">Por conciliar</TableHead>
              <TableHead className="w-44 hidden md:table-cell">Último contacto</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {query || statusFilter !== "all" ? "Sin resultados" : "No hay clientes"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                if (row.kind === "invitation") {
                  return (
                    <TableRow key={`inv-${row.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{row.clientName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="w-32 hidden sm:table-cell">
                        <ClientStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="w-24 text-right text-muted-foreground">—</TableCell>
                      <TableCell className="w-44 hidden md:table-cell text-muted-foreground">
                        {formatDistanceToNow(row.invitedAt, { locale: es, addSuffix: true })}
                      </TableCell>
                      <TableCell className="w-10">
                        <InvitationActionsMenu
                          invitationId={row.id}
                          email={row.email}
                          token={row.token}
                          status={row.status}
                          emailSentAt={row.emailSentAt}
                        />
                      </TableCell>
                    </TableRow>
                  )
                }

                return (
                  <TableRow
                    key={`client-${row.id}`}
                    className="cursor-pointer"
                    onClick={() => router.push(`/clients/${row.clientId}`)}
                  >
                    <TableCell className="font-medium">{row.clientName}</TableCell>
                    <TableCell className="w-32 hidden sm:table-cell">
                      <ClientStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="w-24 text-right tabular-nums">
                      {row.unmatchedInbox > 0 ? (
                        <span className="font-medium text-orange-500">{row.unmatchedInbox}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-44 hidden md:table-cell text-muted-foreground">
                      {row.lastContactedAt
                        ? formatDistanceToNow(row.lastContactedAt, { locale: es, addSuffix: true })
                        : "Sin contactar"}
                    </TableCell>
                    <TableCell className="w-10" />
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
