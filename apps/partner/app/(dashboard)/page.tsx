import { getPartnerAuthContext } from "@/lib/auth"
import { daysAgo } from "@/lib/time"
import { prisma, transactionDocumentedWhere } from "@polso/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import {
  Buildings,
  CheckCircle,
  Warning,
  UserPlus,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr"
import { formatDistanceToNow, differenceInDays, endOfMonth } from "date-fns"
import { getPartnerQuarterRollup } from "@/features/clients/queries/get-partner-quarter-rollup"
import { getDaysToQuarterEnd, getCurrentQuarter } from "@polso/utils/quarters"
import { es } from "date-fns/locale"
import Link from "next/link"
import { BulkReminderButton } from "@/components/dashboard/bulk-reminder-button"
import { SendReminderButton } from "@/features/proactive/components/send-reminder-button"

function startOfMonth(d = new Date()) {
  const r = new Date(d)
  r.setDate(1)
  r.setHours(0, 0, 0, 0)
  return r
}

async function getDashboardData(organizationId: string) {
  const links = await prisma.partnerClient.findMany({
    where: { partnerId: organizationId, status: "active" },
    select: { clientId: true, client: { select: { id: true, name: true } } },
  })

  if (links.length === 0) return null

  const clientIds = links.map((l) => l.clientId)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = startOfMonth()
  const daysToClose = differenceInDays(endOfMonth(new Date()), new Date())

  const [
    totalByClient,
    documentedByClient,
    inboxPendingByClient,
    suggestionsByClient,
    accountSyncRaw,
    lastContactRaw,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, date: { gte: monthStart } },
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, date: { gte: monthStart }, ...transactionDocumentedWhere },
      _count: { id: true },
    }),
    prisma.inboxItem.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, status: { in: ["new", "no_match"] } },
      _count: { id: true },
    }),
    prisma.matchSuggestion.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, status: "pending" },
      _count: { id: true },
    }),
    prisma.account.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds } },
      _max: { lastSyncedAt: true },
    }),
    prisma.proactiveMessage.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds } },
      _max: { sentAt: true },
    }),
  ])

  const totalMap = Object.fromEntries(totalByClient.map((r) => [r.organizationId, r._count.id]))
  const documentedMap = Object.fromEntries(documentedByClient.map((r) => [r.organizationId, r._count.id]))
  const inboxPendingMap = Object.fromEntries(inboxPendingByClient.map((r) => [r.organizationId, r._count.id]))
  const suggestionsMap = Object.fromEntries(suggestionsByClient.map((r) => [r.organizationId, r._count.id]))
  const syncMap = Object.fromEntries(accountSyncRaw.map((r) => [r.organizationId, r._max.lastSyncedAt]))
  const lastContactMap = Object.fromEntries(lastContactRaw.map((r) => [r.organizationId, r._max.sentAt]))

  const clients = links
    .map((link) => {
      const total = totalMap[link.clientId] ?? 0
      const documented = documentedMap[link.clientId] ?? 0
      const coverage = total > 0 ? Math.round((documented / total) * 100) : null
      const inboxPending = inboxPendingMap[link.clientId] ?? 0
      const suggestionsPending = suggestionsMap[link.clientId] ?? 0
      const totalPending = inboxPending + suggestionsPending
      const lastSyncedAt = syncMap[link.clientId] ?? null
      const lastContactedAt = lastContactMap[link.clientId] ?? null
      const isStaleSince = lastSyncedAt ? lastSyncedAt < sevenDaysAgo : false

      return {
        clientId: link.clientId,
        clientName: link.client.name,
        total,
        documented,
        coverage,
        totalPending,
        lastSyncedAt,
        lastContactedAt,
        isStaleSince,
      }
    })
    .sort((a, b) => {
      if (a.isStaleSince && !b.isStaleSince) return -1
      if (!a.isStaleSince && b.isStaleSince) return 1
      return b.totalPending - a.totalPending
    })

  return { clients, totalClients: links.length, daysToClose }
}

function CoverageBar({ pct }: { pct: number }) {
  const c = pct === 100 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${c}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums shrink-0">{pct}%</span>
    </div>
  )
}

export default async function DashboardPage() {
  const ctx = await getPartnerAuthContext()
  const [data, quarterRollup] = await Promise.all([
    getDashboardData(ctx.organizationId),
    getPartnerQuarterRollup(ctx.organizationId),
  ])
  const daysToQuarterEnd = getDaysToQuarterEnd()
  const currentQuarter = getCurrentQuarter()
  const inQuarterMode = daysToQuarterEnd <= 30

  if (!data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Buildings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sin clientes activos</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Invita a tus clientes para empezar a gestionar su documentación.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/clients">
                <UserPlus className="mr-2 h-4 w-4" />
                Invitar clientes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { clients, totalClients, daysToClose } = data

  const incompleteCount = clients.filter((c) => c.coverage !== null && c.coverage < 100).length

  const quarterMap = quarterRollup
    ? Object.fromEntries(quarterRollup.clients.map((c) => [c.clientId, c]))
    : {}

  const sortedClients = inQuarterMode && quarterRollup
    ? [...clients].sort((a, b) => {
        const aq = quarterMap[a.clientId]
        const bq = quarterMap[b.clientId]
        const aScore = (aq?.ivaPendingCount ?? 0) + (aq?.receiptPendingCount ?? 0)
        const bScore = (bq?.ivaPendingCount ?? 0) + (bq?.receiptPendingCount ?? 0)
        return bScore - aScore
      })
    : clients

  // KPI: clients fully ready for close
  const readyCount = clients.filter((client) => {
    const qStatus = quarterMap[client.clientId]
    const receiptPending = inQuarterMode && qStatus ? qStatus.receiptPendingCount : client.total - client.documented
    return client.totalPending === 0
      && receiptPending === 0
      && (!inQuarterMode || !qStatus || qStatus.ivaPendingCount === 0)
  }).length

  // KPI: clients with open items + no contact in 7 days
  const sevenDaysAgo = daysAgo(7)
  const needsFollowUpCount = clients.filter((client) => {
    const qStatus = quarterMap[client.clientId]
    const receiptPending = inQuarterMode && qStatus ? qStatus.receiptPendingCount : client.total - client.documented
    const hasPending = client.totalPending > 0
      || receiptPending > 0
      || (inQuarterMode && qStatus && qStatus.ivaPendingCount > 0)
    const notRecentlyContacted = !client.lastContactedAt || client.lastContactedAt < sevenDaysAgo
    return hasPending && notRecentlyContacted
  }).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-end">
        <BulkReminderButton incompleteCount={incompleteCount} />
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listos para el cierre</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${readyCount === totalClients ? "text-green-500" : ""}`}>
              {readyCount}
              <span className="text-base font-normal text-muted-foreground"> / {totalClients}</span>
            </div>
            <p className="text-xs text-muted-foreground">clientes con documentación completa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Necesitan seguimiento</CardTitle>
            <Warning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${needsFollowUpCount > 0 ? "text-orange-500" : "text-green-500"}`}>
              {needsFollowUpCount}
            </div>
            <p className="text-xs text-muted-foreground">clientes con pendientes sin contactar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {inQuarterMode ? `Cierre Q${currentQuarter.quarter}` : "Cierre del mes"}
            </CardTitle>
            <CalendarBlank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {inQuarterMode ? (
              <>
                <div className={`text-2xl font-bold ${daysToQuarterEnd <= 7 ? "text-red-500" : daysToQuarterEnd <= 14 ? "text-amber-500" : ""}`}>
                  {daysToQuarterEnd}
                </div>
                <p className="text-xs text-muted-foreground">días para Modelo 303</p>
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${daysToClose <= 5 ? "text-red-500" : daysToClose <= 10 ? "text-amber-500" : ""}`}>
                  {daysToClose}
                </div>
                <p className="text-xs text-muted-foreground">días para fin de mes</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Client overview ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          {inQuarterMode ? (
            <>
              <CardTitle>Clientes — Q{currentQuarter.quarter} {new Date().getFullYear()}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Cobertura trimestral e IVA pendiente por cliente</p>
            </>
          ) : (
            <>
              <CardTitle>Clientes</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Cobertura de documentación por cliente</p>
            </>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sortedClients.map((client) => {
              const qStatus = quarterMap[client.clientId]

              const receiptPending = inQuarterMode && qStatus
                ? qStatus.receiptPendingCount
                : client.total - client.documented

              // Composite closure readiness: avg of receipt coverage + IVA coverage
              const closurePct = inQuarterMode && qStatus && qStatus.totalInQuarter > 0
                ? Math.round(
                    (qStatus.documentedInQuarter / qStatus.totalInQuarter) * 50 +
                    ((qStatus.totalInQuarter - qStatus.ivaPendingCount) / qStatus.totalInQuarter) * 50
                  )
                : client.coverage

              const isUpToDate = client.totalPending === 0
                && receiptPending === 0
                && (!inQuarterMode || !qStatus || qStatus.ivaPendingCount === 0)

              return (
                <Link
                  key={client.clientId}
                  href={`/clients/${client.clientId}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Name column */}
                  <div className="w-44 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {client.isStaleSince ? (
                        <Warning className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      ) : isUpToDate ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{client.clientName}</p>
                    </div>
                    {client.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground pl-5">
                        Sync {formatDistanceToNow(client.lastSyncedAt, { locale: es, addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {/* Closure readiness bar */}
                  <div className="flex-1 min-w-0">
                    {closurePct !== null ? (
                      <CoverageBar pct={closurePct} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin gastos</span>
                    )}
                  </div>

                  {/* Status counters */}
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {inQuarterMode && qStatus
                          ? `${qStatus.documentedInQuarter}/${qStatus.totalInQuarter}`
                          : `${client.documented}/${client.total}`}
                      </p>
                      <p className="text-xs text-muted-foreground">documentados</p>
                    </div>
                    {inQuarterMode && qStatus && qStatus.totalInQuarter > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">
                          {qStatus.totalInQuarter - qStatus.ivaPendingCount}/{qStatus.totalInQuarter}
                        </p>
                        <p className="text-xs text-muted-foreground">con IVA</p>
                      </div>
                    )}
                    {client.totalPending > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{client.totalPending}</p>
                        <p className="text-xs text-muted-foreground">en bandeja</p>
                      </div>
                    )}
                  </div>

                  {/* Last contact + reminder button */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground w-32 text-right">
                      {client.lastContactedAt
                        ? formatDistanceToNow(client.lastContactedAt, { locale: es, addSuffix: true })
                        : "Sin contactar"}
                    </span>
                    <SendReminderButton
                      clientId={client.clientId}
                      lastContactedAt={client.lastContactedAt?.toISOString() ?? null}
                      compact
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
