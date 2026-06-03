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
import type { PartnerClientSummary } from "@/features/clients/queries/get-client-list"

type InboxSort = "none" | "desc" | "asc"
type ContactSort = "none" | "oldest" | "newest"

export function ClientListTable({ clients }: { clients: PartnerClientSummary[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [inboxSort, setInboxSort] = useState<InboxSort>("none")
  const [contactSort, setContactSort] = useState<ContactSort>("none")

  const filtered = useMemo(() => {
    let result = clients

    if (query.trim()) {
      result = result.filter((c) =>
        c.clientName.toLowerCase().includes(query.trim().toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (inboxSort !== "none") {
      result = [...result].sort((a, b) =>
        inboxSort === "desc"
          ? b.unmatchedInbox - a.unmatchedInbox
          : a.unmatchedInbox - b.unmatchedInbox
      )
    } else if (contactSort !== "none") {
      result = [...result].sort((a, b) => {
        const at = a.lastContactedAt?.getTime() ?? 0
        const bt = b.lastContactedAt?.getTime() ?? 0
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
            <SelectItem value="pending">Pendiente</SelectItem>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {query || statusFilter !== "all" ? "Sin resultados" : "No hay clientes"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/clients/${client.clientId}`)}
                >
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell className="w-32 hidden sm:table-cell">
                    <ClientStatusBadge status={client.status} />
                  </TableCell>
                  <TableCell className="w-24 text-right tabular-nums">
                    {client.unmatchedInbox > 0 ? (
                      <span className="font-medium text-orange-500">{client.unmatchedInbox}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="w-44 hidden md:table-cell text-muted-foreground">
                    {client.lastContactedAt
                      ? formatDistanceToNow(client.lastContactedAt, { locale: es, addSuffix: true })
                      : "Sin contactar"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
