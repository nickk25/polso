import { getPartnerAuthContext } from "@/lib/auth"
import { prisma, transactionDocumentedWhere } from "@polso/db"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import {
  Buildings,
  TelegramLogo,
  WhatsappLogo,
  Paperclip,
  ArrowRight,
  CheckCircle,
  Warning,
  UserPlus,
  Stack,
  Sparkle,
  CalendarBlank,
  TrendUp,
  TrendDown,
  ArrowDown,
  ArrowUp,
} from "@phosphor-icons/react/dist/ssr"
import { formatDistanceToNow, differenceInDays, endOfMonth } from "date-fns"
import { getPartnerQuarterRollup } from "@/features/clients/queries/get-partner-quarter-rollup"
import { getDaysToQuarterEnd, getCurrentQuarter } from "@polso/utils/quarters"
import { es } from "date-fns/locale"
import Link from "next/link"
import { BulkReminderButton } from "@/components/dashboard/bulk-reminder-button"

function startOfMonth(d = new Date()) {
  const r = new Date(d)
  r.setDate(1)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfLastMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getDashboardData(organizationId: string) {
  const links = await prisma.partnerClient.findMany({
    where: { partnerId: organizationId, status: "active" },
    select: { clientId: true, client: { select: { id: true, name: true } } },
  })
  const pendingClients = await prisma.partnerClient.count({
    where: { partnerId: organizationId, status: "pending" },
  })

  if (links.length === 0) {
    return null
  }

  const clientIds = links.map((l) => l.clientId)
  const clientNameMap = Object.fromEntries(links.map((l) => [l.clientId, l.client.name]))
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const monthStart = startOfMonth()
  const lastMonthStart = startOfLastMonth()
  const daysToClose = differenceInDays(endOfMonth(new Date()), new Date())

  const [
    toProcessCount,
    suggestionsCount,
    activeThisWeekRaw,
    workQueue,
    pendingSuggestions,
    conciliatedThisMonth,
    conciliatedLastMonth,
    recentMatches,
    totalByClient,
    documentedByClient,
    unmatchedByClient,
    activityGrouped,
    weeklyGrouped,
    accountSyncRaw,
  ] = await Promise.all([
    prisma.inboxItem.count({
      where: { organizationId: { in: clientIds }, status: { in: ["new", "no_match"] } },
    }),
    prisma.matchSuggestion.count({
      where: { organizationId: { in: clientIds }, status: "pending" },
    }),
    prisma.inboxItem.findMany({
      where: { organizationId: { in: clientIds }, createdAt: { gte: sevenDaysAgo } },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    // Unmatched receipts work queue, newest first
    prisma.inboxItem.findMany({
      where: { organizationId: { in: clientIds }, status: { in: ["new", "no_match"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        fileName: true,
        displayName: true,
        amount: true,
        currency: true,
        source: true,
        status: true,
        createdAt: true,
        organizationId: true,
      },
    }),
    // Pending suggestions, highest confidence first
    prisma.matchSuggestion.findMany({
      where: { organizationId: { in: clientIds }, status: "pending" },
      orderBy: { confidenceScore: "desc" },
      take: 8,
      select: {
        id: true,
        organizationId: true,
        confidenceScore: true,
        inboxItem: { select: { fileName: true, displayName: true, amount: true, currency: true } },
        transaction: { select: { merchantName: true, name: true, amount: true, currency: true, date: true } },
      },
    }),
    // Receipts matched this month
    prisma.inboxItem.count({
      where: { organizationId: { in: clientIds }, status: "done", createdAt: { gte: monthStart } },
    }),
    // Receipts matched last month (for trend)
    prisma.inboxItem.count({
      where: {
        organizationId: { in: clientIds },
        status: "done",
        createdAt: { gte: lastMonthStart, lt: monthStart },
      },
    }),
    // Recently matched (for activity log)
    prisma.inboxItem.findMany({
      where: { organizationId: { in: clientIds }, status: "done" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        fileName: true,
        displayName: true,
        source: true,
        amount: true,
        currency: true,
        updatedAt: true,
        organizationId: true,
        transaction: { select: { merchantName: true, name: true } },
      },
    }),
    // All transactions this month per client
    prisma.transaction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, date: { gte: monthStart } },
      _count: { id: true },
    }),
    // Documented transactions this month per client
    prisma.transaction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, date: { gte: monthStart }, ...transactionDocumentedWhere },
      _count: { id: true },
    }),
    // Unmatched inbox per client
    prisma.inboxItem.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, status: { in: ["new", "no_match"] } },
      _count: { id: true },
    }),
    // Last receipt per client + total
    prisma.inboxItem.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds } },
      _count: { id: true },
      _max: { createdAt: true },
    }),
    // Inbox this week per client
    prisma.inboxItem.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds }, createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
    // Last sync per client
    prisma.account.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: clientIds } },
      _max: { lastSyncedAt: true },
    }),
  ])

  // Build index maps
  const totalMap = Object.fromEntries(totalByClient.map((r) => [r.organizationId, r._count.id]))
  const documentedMap = Object.fromEntries(documentedByClient.map((r) => [r.organizationId, r._count.id]))
  const unmatchedMap = Object.fromEntries(unmatchedByClient.map((r) => [r.organizationId, r._count.id]))
  const activityMap = Object.fromEntries(activityGrouped.map((r) => [r.organizationId, { total: r._count.id, lastAt: r._max.createdAt }]))
  const weeklyMap = Object.fromEntries(weeklyGrouped.map((r) => [r.organizationId, r._count.id]))
  const syncMap = Object.fromEntries(accountSyncRaw.map((r) => [r.organizationId, r._max.lastSyncedAt]))

  // Client summaries for the coverage table
  const clients = links
    .map((link) => {
      const total = totalMap[link.clientId] ?? 0
      const documented = documentedMap[link.clientId] ?? 0
      const unmatched = unmatchedMap[link.clientId] ?? 0
      const coverage = total > 0 ? Math.round((documented / total) * 100) : null
      const lastAt = activityMap[link.clientId]?.lastAt ?? null
      const thisWeek = weeklyMap[link.clientId] ?? 0
      const lastSyncedAt = syncMap[link.clientId] ?? null
      const isStaleSince = lastSyncedAt && lastSyncedAt < sevenDaysAgo
      const isSilent = lastAt ? lastAt < fourteenDaysAgo : true
      const urgency = (isStaleSince ? 500 : 0) + (total - documented) + unmatched

      return {
        clientId: link.clientId,
        clientName: link.client.name,
        total,
        documented,
        unmatched,
        coverage,
        lastAt,
        thisWeek,
        lastSyncedAt,
        isStaleSince,
        isSilent,
        urgency,
      }
    })
    .sort((a, b) => b.urgency - a.urgency)

  // Client activity list (sorted: silent first, then active)
  const clientActivity = [...clients].sort((a, b) => {
    if (a.isSilent && !b.isSilent) return -1
    if (!a.isSilent && b.isSilent) return 1
    if (a.thisWeek !== b.thisWeek) return b.thisWeek - a.thisWeek
    return (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0)
  })

  // Global coverage
  const totalTransactions = clients.reduce((s, c) => s + c.total, 0)
  const totalDocumented = clients.reduce((s, c) => s + c.documented, 0)
  const coveragePct = totalTransactions > 0 ? Math.round((totalDocumented / totalTransactions) * 100) : null
  const upToDate = clients.filter((c) => c.coverage === 100).length

  return {
    kpis: {
      toProcess: toProcessCount,
      suggestions: suggestionsCount,
      activeThisWeek: activeThisWeekRaw.length,
      totalClients: links.length,
      daysToClose,
      pendingClients,
    },
    progress: {
      coveragePct,
      totalTransactions,
      totalDocumented,
      conciliatedThisMonth,
      conciliatedLastMonth,
      upToDate,
      totalClients: links.length,
    },
    workQueue: workQueue.map((i) => ({ ...i, clientName: clientNameMap[i.organizationId] ?? "—" })),
    pendingSuggestions: pendingSuggestions.map((s) => ({ ...s, clientName: clientNameMap[s.organizationId] ?? "—" })),
    recentMatches: recentMatches.map((i) => ({ ...i, clientName: clientNameMap[i.organizationId] ?? "—" })),
    clients,
    clientActivity,
  }
}

function SourceIcon({ source }: { source: string }) {
  if (source === "telegram") return <TelegramLogo className="h-4 w-4 text-sky-500 shrink-0" />
  if (source === "whatsapp") return <WhatsappLogo className="h-4 w-4 text-green-500 shrink-0" />
  return <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const cls = pct >= 80 ? "bg-green-500/10 text-green-600 border-green-200" : pct >= 60 ? "bg-amber-500/10 text-amber-600 border-amber-200" : ""
  return (
    <Badge variant="outline" className={`text-xs tabular-nums shrink-0 ${cls}`}>
      {pct}%
    </Badge>
  )
}

function CoverageBar({ pct, color = "green" }: { pct: number; color?: string }) {
  const bg = color === "green" ? "bg-green-500" : color === "amber" ? "bg-amber-500" : "bg-red-500"
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

function formatAmount(amount: unknown, currency: string) {
  if (!amount) return null
  return Number(amount).toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default async function DashboardPage() {
  const ctx = await getPartnerAuthContext()
  const [data, quarterRollup] = await Promise.all([
    getDashboardData(ctx.organizationId),
    getPartnerQuarterRollup(ctx.organizationId),
  ])
  const monthLabel = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const daysToQuarterEnd = getDaysToQuarterEnd()
  const currentQuarter = getCurrentQuarter()
  const inQuarterMode = daysToQuarterEnd <= 30

  if (!data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
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

  const { kpis, progress, workQueue, pendingSuggestions, recentMatches, clients, clientActivity } = data
  const conciliationTrend = progress.conciliatedLastMonth > 0
    ? ((progress.conciliatedThisMonth - progress.conciliatedLastMonth) / progress.conciliatedLastMonth) * 100
    : null

  const incompleteCount = clients.filter((c) => c.coverage !== null && c.coverage < 100).length

  const quarterMap = quarterRollup
    ? Object.fromEntries(quarterRollup.clients.map((c) => [c.clientId, c]))
    : {}
  const sortedClients =
    inQuarterMode && quarterRollup
      ? [...clients].sort((a, b) => {
          const aq = quarterMap[a.clientId]
          const bq = quarterMap[b.clientId]
          const aScore = (aq?.ivaPendingCount ?? 0) + (aq?.receiptPendingCount ?? 0)
          const bScore = (bq?.ivaPendingCount ?? 0) + (bq?.receiptPendingCount ?? 0)
          return bScore - aScore
        })
      : clients

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <BulkReminderButton incompleteCount={incompleteCount} />
      </div>

      {/* ── Row 1: KPIs ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por procesar</CardTitle>
            <Stack className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.toProcess > 0 ? "text-orange-500" : "text-green-500"}`}>
              {kpis.toProcess}
            </div>
            <p className="text-xs text-muted-foreground">comprobantes sin conciliar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sugerencias</CardTitle>
            <Sparkle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.suggestions > 0 ? "text-blue-500" : ""}`}>
              {kpis.suggestions}
            </div>
            <p className="text-xs text-muted-foreground">matches por confirmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos esta semana</CardTitle>
            <Buildings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.activeThisWeek}
              <span className="text-base font-normal text-muted-foreground"> / {kpis.totalClients}</span>
            </div>
            <p className="text-xs text-muted-foreground">clientes enviaron comprobantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {inQuarterMode ? `Cierre del trimestre Q${currentQuarter.quarter}` : "Cierre del mes"}
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
                <div className={`text-2xl font-bold ${kpis.daysToClose <= 5 ? "text-red-500" : kpis.daysToClose <= 10 ? "text-amber-500" : ""}`}>
                  {kpis.daysToClose}
                </div>
                <p className="text-xs text-muted-foreground">días para fin de mes</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Progress cards ────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Overall coverage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura mensual</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.coveragePct !== null ? `${progress.coveragePct}%` : "—"}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (progress.coveragePct ?? 0) === 100
                      ? "bg-green-500"
                      : (progress.coveragePct ?? 0) >= 70
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${progress.coveragePct ?? 0}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.totalDocumented}/{progress.totalTransactions} transacciones documentadas
            </p>
          </CardContent>
        </Card>

        {/* Receipts matched this month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conciliados este mes</CardTitle>
            {conciliationTrend !== null && conciliationTrend >= 0 ? (
              <TrendUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.conciliatedThisMonth}</div>
            <div className="mt-2 flex items-center gap-1">
              {conciliationTrend !== null ? (
                <>
                  {conciliationTrend >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${conciliationTrend >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {Math.abs(Math.round(conciliationTrend))}% vs mes anterior
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {progress.conciliatedLastMonth} el mes pasado
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clients at 100% */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes al día</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.upToDate}
              <span className="text-base font-normal text-muted-foreground"> / {progress.totalClients}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progress.totalClients > 0 ? (progress.upToDate / progress.totalClients) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {progress.totalClients > 0 ? Math.round((progress.upToDate / progress.totalClients) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Work queue + Suggestions ──────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Work queue */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cola de trabajo</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Comprobantes sin conciliar</p>
            </div>
            {kpis.toProcess > 10 && (
              <Badge variant="secondary">{kpis.toProcess} total</Badge>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {workQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                <p className="text-sm font-medium">Todo al día</p>
                <p className="text-xs text-muted-foreground mt-1">No hay comprobantes pendientes.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[360px] overflow-y-auto">
                {workQueue.map((item) => (
                  <Link
                    key={item.id}
                    href={`/clients/${item.organizationId}/inbox`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <SourceIcon source={item.source} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.displayName ?? item.fileName}</p>
                      <p className="text-xs text-muted-foreground">{item.clientName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.amount && (
                        <p className="text-sm font-medium tabular-nums">{formatAmount(item.amount, item.currency)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sugerencias de conciliación</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Matches por confirmar</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {pendingSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                <p className="text-sm font-medium">Sin sugerencias pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">El sistema no tiene matches por revisar.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[360px] overflow-y-auto">
                {pendingSuggestions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/clients/${s.organizationId}/conciliation`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {s.inboxItem.displayName ?? s.inboxItem.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.transaction.merchantName ?? s.transaction.name ?? "—"} · {s.clientName}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {s.inboxItem.amount && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatAmount(s.inboxItem.amount, s.inboxItem.currency)}
                        </span>
                      )}
                      <ConfidenceBadge score={s.confidenceScore} />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Client activity + Recent matches ───────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Client activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Actividad de clientes</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Comprobantes enviados esta semana</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {clientActivity.map((client) => (
                <Link
                  key={client.clientId}
                  href={`/clients/${client.clientId}/inbox`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {client.isSilent ? (
                      <Warning className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    ) : client.thisWeek > 0 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{client.clientName}</p>
                      {client.isSilent && (
                        <p className="text-xs text-orange-500">Sin actividad en más de 2 semanas</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    {client.thisWeek > 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        {client.thisWeek} esta semana
                      </Badge>
                    ) : client.lastAt ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(client.lastAt, { locale: es, addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin comprobantes</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent matches */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Conciliaciones recientes</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Últimos comprobantes procesados</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentMatches.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground px-6">
                Aún no hay conciliaciones realizadas
              </div>
            ) : (
              <div className="divide-y">
                {recentMatches.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                    <SourceIcon source={item.source} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.displayName ?? item.fileName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.transaction?.merchantName ?? item.transaction?.name ?? "—"} · {item.clientName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.amount && (
                        <p className="text-sm font-medium tabular-nums">{formatAmount(item.amount, item.currency)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.updatedAt, { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Full client coverage table ────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {inQuarterMode ? (
              <>
                <CardTitle>Estado de clientes — Q{currentQuarter.quarter} {new Date().getFullYear()}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Cobertura trimestral e IVA pendiente por cliente</p>
              </>
            ) : (
              <>
                <CardTitle>Estado de clientes — {new Date().toLocaleDateString("es-ES", { month: "long" })}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Cobertura de documentación por cliente</p>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              Gestionar <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sortedClients.map((client) => {
              const qStatus = quarterMap[client.clientId]
              return (
                    <Link
                      key={client.clientId}
                      href={`/clients/${client.clientId}/transactions`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Name + sync warning */}
                      <div className="w-40 shrink-0">
                        <div className="flex items-center gap-1.5">
                          {client.isStaleSince ? (
                            <Warning className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          ) : client.coverage === 100 ? (
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

                      {/* Coverage bar */}
                      <div className="flex-1 min-w-0">
                        {inQuarterMode && qStatus ? (
                          qStatus.coverageQuarterPct !== null ? (
                            <CoverageBar pct={qStatus.coverageQuarterPct} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin gastos</span>
                          )
                        ) : client.coverage !== null ? (
                          <CoverageBar pct={client.coverage} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin gastos</span>
                        )}
                      </div>

                      {/* Counts + IVA badge in quarter mode */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium tabular-nums">{client.documented}/{client.total}</p>
                          <p className="text-xs text-muted-foreground">documentados</p>
                        </div>
                        {inQuarterMode && qStatus && qStatus.ivaPendingCount > 0 ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 shrink-0">
                            IVA: {qStatus.ivaPendingCount}
                          </Badge>
                        ) : client.unmatched > 0 ? (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 shrink-0">
                            {client.unmatched} sin match
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground w-20 text-right">—</span>
                        )}
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
        </CardContent>
      </Card>
    </div>
  )
}
