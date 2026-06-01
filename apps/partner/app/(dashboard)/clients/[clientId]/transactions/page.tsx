import Link from "next/link"
import { getPartnerAuthContext } from "@/lib/auth"
import {
  getClientTransactions,
  getClientTransactionStats,
} from "@/features/transactions/queries/get-client-transactions"
import { TransactionFilters } from "@/features/transactions/components/transaction-filters"
import { TransactionPagination } from "@/features/transactions/components/transaction-pagination"
import { TransactionTable } from "@/features/transactions/components/transaction-table"
import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr"

const PAGE_SIZE = 50

interface PageProps {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{
    page?: string
    search?: string
    receiptStatus?: string
    dateFrom?: string
    dateTo?: string
  }>
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
}

export default async function ClientTransactionsPage({ params, searchParams }: PageProps) {
  const { clientId } = await params
  const sp = await searchParams

  const page = parseInt(sp.page || "1", 10)
  const search = sp.search || undefined
  const receiptStatus = (sp.receiptStatus as "con_recibo" | "sin_recibo") || undefined
  const dateFrom = sp.dateFrom || undefined
  const dateTo = sp.dateTo || undefined

  const ctx = await getPartnerAuthContext()

  const [{ items, total, pages }, stats] = await Promise.all([
    getClientTransactions(ctx.organizationId, clientId, {
      page,
      pageSize: PAGE_SIZE,
      search,
      receiptStatus,
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined,
    }),
    getClientTransactionStats(ctx.organizationId, clientId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Transacciones</h1>
        <p className="text-sm text-muted-foreground">
          {total > 0 ? `${total} transacciones` : "Sin transacciones registradas"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Gastos este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Gastos mes anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(stats.totalLastMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Documentados este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.countWithReceipt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sin comprobante este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.countPending > 0 ? "text-orange-600" : ""}`}>
              {stats.countPending}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TransactionFilters
        clientId={clientId}
        search={search}
        receiptStatus={receiptStatus}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={items} clientId={clientId} />
          <TransactionPagination
            clientId={clientId}
            currentPage={page}
            totalPages={pages}
            total={total}
            pageSize={PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </div>
  )
}
