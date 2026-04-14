import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import { getClientDetail } from "@/features/clients/queries/get-client-detail"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import { ArrowLeft, FileText, CreditCard, ArrowsClockwise, Export } from "@phosphor-icons/react/dist/ssr"
import { SendReminderButton } from "@/features/proactive/components/send-reminder-button"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const ctx = await getPartnerAuthContext()
  const client = await getClientDetail(ctx.organizationId, clientId)

  const tabs = [
    { label: "Transacciones", href: `/clients/${clientId}/transactions` },
    { label: "Comprobantes", href: `/clients/${clientId}/inbox` },
    { label: "Conciliación", href: `/clients/${clientId}/conciliation` },
    { label: "Exportar", href: `/clients/${clientId}/export` },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/clients">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Clientes
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{client.name}</span>
        </div>
        {(client.telegramChatId || client.whatsappPhone) && (
          <SendReminderButton clientId={clientId} lastContactedAt={client.lastContactedAt} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.accounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Balance total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.accounts
                .reduce((sum, a) => sum + (a.balanceCurrent ?? 0), 0)
                .toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Gastos 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.totalExpenses30d.toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Comprobantes sin match</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${client.unmatchedInbox > 0 ? "text-orange-600" : ""}`}>
              {client.unmatchedInbox}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick nav tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab.href} asChild variant="outline" size="sm">
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </div>

      {/* Bank accounts list */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Cuentas bancarias</h2>
        <div className="space-y-2">
          {client.accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{account.name}</p>
                {account.institutionName && (
                  <p className="text-xs text-muted-foreground">{account.institutionName}</p>
                )}
              </div>
              <div className="text-right">
                {account.balanceCurrent !== null && (
                  <p className="text-sm font-semibold">
                    {account.balanceCurrent.toLocaleString("es-ES", {
                      style: "currency",
                      currency: account.currency,
                    })}
                  </p>
                )}
                <Badge
                  variant={account.status === "active" ? "default" : "secondary"}
                  className="mt-1 text-xs"
                >
                  {account.status === "active" ? "Activa" : account.status === "disconnected" ? "Desconectada" : "Error"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
