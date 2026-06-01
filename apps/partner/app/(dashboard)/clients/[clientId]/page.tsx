import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getClientDetail } from "@/features/clients/queries/get-client-detail"
import { getClientOverview } from "@/features/clients/queries/get-client-overview"
import { getClientExports } from "@/features/export/queries/get-client-exports"
import { getClientVATSummary } from "@/features/analytics/queries/get-client-vat-summary"
import { getClientProfitLoss } from "@/features/analytics/queries/get-client-profit-loss"
import { getClientQuarterPendings } from "@/features/clients/queries/get-client-quarter-pendings"
import { ClientVatCard } from "@/features/analytics/components/client-vat-card"
import { ClientPLTable } from "@/features/analytics/components/client-pl-table"
import { ClientPendingsCard } from "@/features/clients/components/client-pendings-card"
import { ExportForm } from "@/components/export/export-form"
import { BankReconnectButton } from "@/components/bank/bank-reconnect-button"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import {
  ArrowLeft,
  ArrowRight,
  TelegramLogo,
  WhatsappLogo,
  Paperclip,
  CheckCircle,
  Warning,
  XCircle,
  Sparkle,
  Stack,
  TrendUp,
  TrendDown,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { SendReminderButton } from "@/features/proactive/components/send-reminder-button"

function SourceIcon({ source }: { source: string }) {
  if (source === "telegram") return <TelegramLogo className="h-4 w-4 text-sky-500 shrink-0" />
  if (source === "whatsapp") return <WhatsappLogo className="h-4 w-4 text-green-500 shrink-0" />
  return <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const cls =
    pct >= 80
      ? "bg-green-500/10 text-green-600 border-green-200"
      : pct >= 60
        ? "bg-amber-500/10 text-amber-600 border-amber-200"
        : ""
  return (
    <Badge variant="outline" className={`text-xs tabular-nums shrink-0 ${cls}`}>
      {pct}%
    </Badge>
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

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()

  const [client, overview, recentExports, partnerOrg, vatSummary, pl, quarterPendings] = await Promise.all([
    getClientDetail(ctx.organizationId, clientId),
    getClientOverview(ctx.organizationId, clientId),
    getClientExports(ctx.organizationId, clientId),
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { csvSeparator: true },
    }),
    getClientVATSummary(ctx.organizationId, clientId),
    getClientProfitLoss(ctx.organizationId, clientId, 6),
    getClientQuarterPendings(ctx.organizationId, clientId),
  ])

  const monthLabel = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const totalBalance = client.accounts.reduce((sum, a) => sum + (a.balanceCurrent ?? 0), 0)
  const currency = client.accounts[0]?.currency ?? "EUR"

  const spendTrend =
    overview.totalLastMonth > 0
      ? ((overview.totalThisMonth - overview.totalLastMonth) / overview.totalLastMonth) * 100
      : null

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const lastSyncedAt = client.accounts.reduce<Date | null>((latest, a) => {
    if (!a.lastSyncedAt) return latest
    if (!latest || a.lastSyncedAt > latest) return a.lastSyncedAt
    return latest
  }, null)
  const isStaleSince = lastSyncedAt && lastSyncedAt < sevenDaysAgo

  const reconnectRateLimited = client.lastContactedAt
    ? new Date(client.lastContactedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    : false

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  function getAccountSeverity(account: (typeof client.accounts)[number]): "error" | "warning" | "ok" {
    if (account.status === "error" || account.syncError) return "error"
    if (account.requisitionExpiresAt && account.requisitionExpiresAt < sevenDaysFromNow) return "warning"
    if (account.lastSyncedAt && account.lastSyncedAt < sevenDaysAgo) return "warning"
    return "ok"
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/clients">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Clientes
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <div>
            <span className="text-sm font-medium">{client.name}</span>
            <span className="ml-2 text-xs text-muted-foreground capitalize">{monthLabel}</span>
          </div>
        </div>
        {(client.telegramChatId || client.whatsappPhone) && (
          <SendReminderButton clientId={clientId} lastContactedAt={client.lastContactedAt} />
        )}
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {/* Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBalance.toLocaleString("es-ES", { style: "currency", currency, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {client.accounts.length} {client.accounts.length === 1 ? "cuenta" : "cuentas"}
            </p>
          </CardContent>
        </Card>

        {/* Gastos del mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del mes</CardTitle>
            {spendTrend !== null && (
              spendTrend >= 0
                ? <TrendUp className="h-4 w-4 text-red-500" />
                : <TrendDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalThisMonth.toLocaleString("es-ES", { style: "currency", currency, maximumFractionDigits: 0 })}
            </div>
            {spendTrend !== null ? (
              <p className={`text-xs ${spendTrend >= 0 ? "text-red-500" : "text-green-500"}`}>
                {spendTrend >= 0 ? "+" : ""}{Math.round(spendTrend)}% vs mes anterior
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {overview.totalLastMonth.toLocaleString("es-ES", { style: "currency", currency, maximumFractionDigits: 0 })} el mes pasado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cobertura */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              overview.coveragePct === null ? "" :
              overview.coveragePct === 100 ? "text-green-600" :
              overview.coveragePct >= 70 ? "text-amber-600" : "text-red-600"
            }`}>
              {overview.coveragePct !== null ? `${overview.coveragePct}%` : "—"}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (overview.coveragePct ?? 0) === 100 ? "bg-green-500" :
                  (overview.coveragePct ?? 0) >= 70 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${overview.coveragePct ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.countWithReceipt}/{overview.countWithReceipt + overview.countPending} documentados
            </p>
          </CardContent>
        </Card>

        {/* Sin comprobante */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin comprobante</CardTitle>
            <Stack className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overview.countPending > 0 ? "text-orange-500" : "text-green-500"}`}>
              {overview.countPending}
            </div>
            <p className="text-xs text-muted-foreground">transacciones este mes</p>
          </CardContent>
        </Card>

        {/* Sugerencias */}
        <Card className={overview.pendingSuggestionsCount > 0 ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}>
          <Link href={`/clients/${clientId}/conciliation`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sugerencias</CardTitle>
              <Sparkle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overview.pendingSuggestionsCount > 0 ? "text-blue-500" : ""}`}>
                {overview.pendingSuggestionsCount}
              </div>
              <p className="text-xs text-muted-foreground">matches por confirmar</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* ── Quarter pendings card ─────────────────────────────────────── */}
      {quarterPendings.daysToClose <= 60 && (
        <ClientPendingsCard clientId={clientId} pendings={quarterPendings} />
      )}

      {/* ── P&L card ──────────────────────────────────────────────────── */}
      {pl.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pérdidas y ganancias — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientPLTable data={pl} currency={currency} />
          </CardContent>
        </Card>
      )}

      {/* ── Work area: inbox + suggestions ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Bandeja pendiente */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bandeja pendiente</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {overview.pendingInboxCount === 0
                  ? "Sin documentos pendientes"
                  : `${overview.pendingInboxCount} sin conciliar`}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/clients/${clientId}/inbox`}>
                Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {overview.recentPendingInbox.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                <p className="text-sm font-medium">Bandeja al día</p>
                <p className="text-xs text-muted-foreground mt-1">No hay comprobantes pendientes.</p>
              </div>
            ) : (
              <div className="divide-y">
                {overview.recentPendingInbox.map((item) => (
                  <Link
                    key={item.id}
                    href={`/clients/${clientId}/inbox`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <SourceIcon source={item.source} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.displayName ?? item.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    {item.amount != null && (
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {formatAmount(item.amount, item.currency)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sugerencias de conciliación */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sugerencias de conciliación</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {overview.pendingSuggestionsCount === 0
                  ? "Sin matches pendientes"
                  : `${overview.pendingSuggestionsCount} por confirmar`}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/clients/${clientId}/conciliation`}>
                Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {overview.topSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                <p className="text-sm font-medium">Todo conciliado</p>
                <p className="text-xs text-muted-foreground mt-1">No hay matches pendientes de revisión.</p>
              </div>
            ) : (
              <div className="divide-y">
                {overview.topSuggestions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/clients/${clientId}/conciliation`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {s.inboxItem.displayName ?? s.inboxItem.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.transaction.merchantName ?? s.transaction.name ?? "—"} ·{" "}
                        {s.transaction.date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {s.inboxItem.amount != null && (
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

      {/* ── Bank accounts ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cuentas bancarias</CardTitle>
            {isStaleSince && lastSyncedAt && (
              <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                <Warning className="h-3.5 w-3.5" />
                Último sync {formatDistanceToNow(lastSyncedAt, { locale: es, addSuffix: true })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clients/${clientId}/transactions`}>
              Ver transacciones <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {client.accounts.map((account) => {
              const severity = getAccountSeverity(account)
              return (
                <div key={account.id} className="flex items-start justify-between px-6 py-4 gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {account.institutionLogo && (
                      <img
                        src={account.institutionLogo}
                        alt={account.institutionName ?? ""}
                        className="h-8 w-8 rounded object-contain shrink-0 mt-0.5"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{account.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                        {account.institutionName && (
                          <p className="text-xs text-muted-foreground">{account.institutionName}</p>
                        )}
                        {account.lastSyncedAt && (
                          <p className="text-xs text-muted-foreground">
                            · Sync {formatDistanceToNow(account.lastSyncedAt, { locale: es, addSuffix: true })}
                          </p>
                        )}
                        {account.requisitionExpiresAt && (
                          <p className="text-xs text-muted-foreground">
                            · Caduca {formatDistanceToNow(account.requisitionExpiresAt, { locale: es, addSuffix: true })}
                          </p>
                        )}
                      </div>
                      {severity === "error" && account.syncError && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          {account.syncError}
                        </p>
                      )}
                      {severity === "warning" && account.requisitionExpiresAt && account.requisitionExpiresAt < sevenDaysFromNow && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Warning className="h-3.5 w-3.5 shrink-0" />
                          Conexión expira pronto — pide al cliente que reconecte
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {account.balanceCurrent !== null && (
                      <p className="text-sm font-semibold tabular-nums">
                        {account.balanceCurrent.toLocaleString("es-ES", {
                          style: "currency",
                          currency: account.currency,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    )}
                    <Badge
                      variant={
                        severity === "error"
                          ? "destructive"
                          : severity === "warning"
                            ? "secondary"
                            : "default"
                      }
                      className="text-xs"
                    >
                      {severity === "error"
                        ? "Error"
                        : severity === "warning"
                          ? "Advertencia"
                          : account.status === "active"
                            ? "Activa"
                            : account.status === "disconnected"
                              ? "Desconectada"
                              : "Error"}
                    </Badge>
                    {severity !== "ok" && (client.telegramChatId || client.whatsappPhone) && (
                      <BankReconnectButton
                        clientId={clientId}
                        accountId={account.id}
                        disabledByRateLimit={reconnectRateLimited}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── VAT Summary ───────────────────────────────────────────────── */}
      <Card>
        <ClientVatCard data={vatSummary} />
      </Card>

      {/* ── Export ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar</CardTitle>
          <p className="text-sm text-muted-foreground">Descarga las transacciones en CSV</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <ExportForm clientId={clientId} separator={partnerOrg?.csvSeparator ?? ";"} />

          {recentExports.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-3">Exportaciones anteriores</p>
              <div className="divide-y border rounded-md">
                {recentExports.map((e) => {
                  // Old csv: records → re-trigger CSV; new R2 ZIPs → download via /api/exports/[id]
                  const href = e.filePath.startsWith("csv:")
                    ? `/api/export?${e.filePath.replace("csv:", "")}`
                    : `/api/exports/${e.id}`
                  return (
                    <a
                      key={e.id}
                      href={href}
                      download
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.generatedByName} · {formatDistanceToNow(e.createdAt, { locale: es, addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {e.entryCount !== null && (
                          <span className="text-xs text-muted-foreground">{e.entryCount} filas</span>
                        )}
                        <DownloadSimple className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
