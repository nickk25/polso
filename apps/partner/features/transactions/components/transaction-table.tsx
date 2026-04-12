"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@polso/ui/badge"
import { Separator } from "@polso/ui/separator"
import { Skeleton } from "@polso/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@polso/ui/sheet"
import { Paperclip, Receipt, ArrowSquareOut } from "@phosphor-icons/react"
import {
  getTransactionInvoicesAction,
  type PartnerInvoice,
} from "../actions/get-transaction-invoices"
import type { ClientTransaction } from "../queries/get-client-transactions"

interface TransactionTableProps {
  transactions: ClientTransaction[]
}

function formatCurrency(amount: number, currency: string) {
  return amount.toLocaleString("es-ES", { style: "currency", currency })
}

function ReceiptStatusBadge({ tx }: { tx: ClientTransaction }) {
  const hasReceipt = tx.expenseStatus === "documented"
  if (hasReceipt) {
    return (
      <Badge variant="default" className="text-xs">
        <Paperclip className="mr-1 h-3 w-3" />
        Documentado
      </Badge>
    )
  }
  // positive = expense (money out) in Tink convention
  if (tx.amount > 0) {
    return (
      <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
        Sin recibo
      </Badge>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function ExpenseTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground">—</span>
  if (type === "fixed") {
    return (
      <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
        Fijo
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
      Variable
    </Badge>
  )
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [selected, setSelected] = useState<ClientTransaction | null>(null)
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  useEffect(() => {
    if (!selected) {
      setInvoices([])
      return
    }
    setInvoicesLoading(true)
    getTransactionInvoicesAction(selected.id)
      .then((result) => {
        if (result.success) setInvoices(result.data)
      })
      .finally(() => setInvoicesLoading(false))
  }, [selected?.id])

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Sin transacciones</p>
        <p className="text-xs text-muted-foreground mt-1">
          No hay transacciones que coincidan con los filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead>Recibo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow
              key={tx.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelected(tx)}
            >
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(tx.date), "d MMM yyyy", { locale: es })}
              </TableCell>
              <TableCell className="max-w-[280px]">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {tx.merchantName ?? tx.name ?? "—"}
                  </span>
                  {tx.merchantName && tx.name && tx.merchantName !== tx.name && (
                    <span className="text-xs text-muted-foreground truncate">{tx.name}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {tx.accountName}
              </TableCell>
              <TableCell>
                <ExpenseTypeBadge type={tx.expenseType} />
              </TableCell>
              <TableCell
                className={`text-right text-sm font-medium whitespace-nowrap ${
                  tx.amount > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {formatCurrency(tx.amount, tx.currency)}
              </TableCell>
              <TableCell>
                <ReceiptStatusBadge tx={tx} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selected?.merchantName ?? selected?.name ?? "Transacción"}
            </SheetTitle>
            <SheetDescription>
              {selected && (
                <span
                  className={`text-base font-semibold ${
                    selected.amount > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(selected.amount, selected.currency)}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="flex flex-col gap-5 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {format(new Date(selected.date), "d MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cuenta</p>
                  <p className="font-medium">{selected.accountName}</p>
                </div>
                {selected.expenseType && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <ExpenseTypeBadge type={selected.expenseType} />
                  </div>
                )}
                {selected.expenseStatus && (
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="font-medium">
                      {selected.expenseStatus === "documented"
                        ? "Documentado"
                        : selected.expenseStatus === "excluded"
                          ? "Excluido"
                          : "Pendiente"}
                    </p>
                  </div>
                )}
                {selected.pending && (
                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-xs">
                      Pendiente de confirmación bancaria
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Facturas y recibos</p>
                  {(invoices.length + selected.inboxItems.length) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {invoices.length + selected.inboxItems.length}
                    </Badge>
                  )}
                </div>

                {invoicesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : invoices.length === 0 && selected.inboxItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay facturas adjuntas a esta transacción.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <a
                        key={inv.id}
                        href={inv.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{inv.fileName}</span>
                        {inv.fileSize && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {(inv.fileSize / 1024).toFixed(0)} KB
                          </span>
                        )}
                        <ArrowSquareOut className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                    {selected.inboxItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{item.fileName}</span>
                        <Badge variant="default" className="text-xs shrink-0">
                          Conciliado
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
