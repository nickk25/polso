"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { MagnifyingGlass, CheckCircle, Warning } from "@phosphor-icons/react"
import { Input } from "@polso/ui/input"
import { ClientStatusBadge } from "./client-status-badge"
import type { PartnerClientSummary } from "@/features/clients/queries/get-client-list"

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

export function ClientListTable({ clients }: { clients: PartnerClientSummary[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? clients.filter((c) =>
        c.clientName.toLowerCase().includes(query.trim().toLowerCase())
      )
    : clients

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        {/* Header */}
        <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
          <div />
          <div>Cliente</div>
          <div className="hidden sm:block w-20 text-center">Estado</div>
          <div className="hidden md:block w-40">Fecha</div>
          <div className="hidden sm:block w-32 text-right">Último sync</div>
          <div className="w-16 text-right">Bandeja</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">
            {query ? "Sin resultados para esa búsqueda" : "No hay clientes"}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((client) => {
              const isStale = client.lastSyncedAt
                ? client.lastSyncedAt < sevenDaysAgo
                : false

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.clientId}`}
                  className="grid grid-cols-[1.5rem_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="shrink-0">
                    {client.status === "pending" ? (
                      <span className="h-3.5 w-3.5 block" />
                    ) : isStale ? (
                      <Warning className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{client.clientName}</p>
                  </div>

                  <div className="hidden sm:block w-20 text-center">
                    <ClientStatusBadge status={client.status} />
                  </div>

                  <div className="hidden md:block w-40 text-xs text-muted-foreground">
                    {client.status === "pending"
                      ? `Inv. ${formatDistanceToNow(client.invitedAt, { locale: es, addSuffix: true })}`
                      : client.connectedAt
                        ? formatDistanceToNow(client.connectedAt, { locale: es, addSuffix: true })
                        : "—"}
                  </div>

                  <div className="hidden sm:block w-32 text-xs text-muted-foreground text-right">
                    {client.lastSyncedAt
                      ? formatDistanceToNow(client.lastSyncedAt, { locale: es, addSuffix: true })
                      : "—"}
                  </div>

                  <div className="w-16 text-right text-sm">
                    {client.unmatchedInbox > 0 ? (
                      <span className="font-medium text-orange-500 tabular-nums">
                        {client.unmatchedInbox}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
