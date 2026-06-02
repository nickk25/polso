"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@polso/ui/badge"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import { Label } from "@polso/ui/label"
import { Separator } from "@polso/ui/separator"
import { Skeleton } from "@polso/ui/skeleton"
import { Textarea } from "@polso/ui/textarea"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@polso/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@polso/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polso/ui/select"
import { Checkbox } from "@polso/ui/checkbox"
import { Paperclip, Receipt, ArrowSquareOut, TelegramLogo, WhatsappLogo, DownloadSimple, Eye, PencilSimple, EnvelopeSimple, X } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { SPANISH_IVA_RATES } from "@polso/utils"
import {
  getTransactionInvoicesAction,
  type PartnerInvoice,
} from "../actions/get-transaction-invoices"
import { updateClientEntryTaxAction } from "../actions/update-client-entry-tax"
import { updateClientEntryAction } from "../actions/update-client-entry"
import { sendReceiptRequestAction } from "../../proactive/actions/send-receipt-request"
import {
  bulkUpdateClientEntryStatusAction,
  bulkUpdateClientEntryTypeAction,
  bulkUpdateClientEntryTaxAction,
} from "../actions/bulk-update-client-entries"
import type { ClientTransaction } from "../queries/get-client-transactions"
import type { ClientCounterparty } from "../queries/get-client-counterparties"

interface TransactionTableProps {
  transactions: ClientTransaction[]
  clientId: string
  counterparties: ClientCounterparty[]
}

function VatCell({
  tx,
  clientId,
}: {
  tx: ClientTransaction
  clientId: string
}) {
  const [open, setOpen] = useState(false)
  const [rate, setRate] = useState<string>(tx.taxRate !== null ? String(tx.taxRate) : "")
  const [amount, setAmount] = useState<string>(tx.taxAmount !== null ? String(tx.taxAmount) : "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const parsedRate = rate === "" ? null : parseFloat(rate)
    const parsedAmount = amount === "" ? null : parseFloat(amount)
    const result = await updateClientEntryTaxAction(clientId, tx.id, parsedRate, parsedAmount)
    setSaving(false)
    if (result.success) {
      toast.success("IVA actualizado")
      setOpen(false)
    } else {
      toast.error(result.error ?? "Error al guardar")
    }
  }

  const display =
    tx.taxRate !== null
      ? `${Math.round(tx.taxRate * 100)}%`
      : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-between gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1.5 py-1 group transition-colors"
        >
          <span>{display ?? <span className="text-muted-foreground/50">—</span>}</span>
          <PencilSimple className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Editar IVA</p>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={rate === "" ? "none" : rate}
              onValueChange={(v) => {
                const newRate = v === "none" ? "" : v
                setRate(newRate)
                if (newRate !== "" && tx.amount) {
                  const r = parseFloat(newRate)
                  const calc = Math.round(Math.abs(tx.amount) * r / (1 + r) * 100) / 100
                  setAmount(String(calc))
                } else {
                  setAmount("")
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin IVA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin IVA</SelectItem>
                {SPANISH_IVA_RATES.filter((r) => r > 0).map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {Math.round(r * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cuota IVA (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function formatCurrency(amount: number, currency: string) {
  return amount.toLocaleString("es-ES", { style: "currency", currency })
}

function ReceiptStatusBadge({ tx }: { tx: ClientTransaction }) {
  const hasReceipt = tx.expenseStatus === "documented" || tx.inboxItems.length > 0
  if (hasReceipt) {
    return (
      <Badge variant="default" className="text-xs">
        <Paperclip className="mr-1 h-3 w-3" />
        Documentado
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
      Sin comprobante
    </Badge>
  )
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

export function TransactionTable({ transactions, clientId, counterparties }: TransactionTableProps) {
  const [selected, setSelected] = useState<ClientTransaction | null>(null)
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // Bulk selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)
  const lastClickedIndex = useRef<number | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && checkedIds.size > 0 && !selected) setCheckedIds(new Set())
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [checkedIds.size, selected])

  const allSelected = transactions.length > 0 && transactions.every((tx) => checkedIds.has(tx.id))
  const someSelected = checkedIds.size > 0 && !allSelected

  const checkedTotal = transactions
    .filter((tx) => checkedIds.has(tx.id))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const checkedCurrency = transactions.find((tx) => checkedIds.has(tx.id))?.currency ?? "EUR"

  const undocumentedCheckedIds = transactions
    .filter((tx) => checkedIds.has(tx.id) && tx.expenseStatus !== "documented" && tx.inboxItems.length === 0)
    .map((tx) => tx.id)

  function toggleSelectAll() {
    if (allSelected) setCheckedIds(new Set())
    else setCheckedIds(new Set(transactions.map((tx) => tx.id)))
  }

  function toggleCheck(txId: string, index: number, shiftKey: boolean) {
    if (shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(lastClickedIndex.current, index)
      const end = Math.max(lastClickedIndex.current, index)
      setCheckedIds((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          const tx = transactions[i]
          if (tx) next.add(tx.id)
        }
        return next
      })
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (next.has(txId)) next.delete(txId)
        else next.add(txId)
        return next
      })
    }
    lastClickedIndex.current = index
  }

  const runBulk = async (fn: () => Promise<unknown>) => {
    setBulkLoading(true)
    await fn()
    setBulkLoading(false)
    setCheckedIds(new Set())
  }

  async function handleReceiptRequest() {
    if (undocumentedCheckedIds.length === 0) return
    setSendingRequest(true)
    const result = await sendReceiptRequestAction(clientId, undocumentedCheckedIds)
    setSendingRequest(false)
    if (result.success) {
      toast.success("Solicitud enviada al cliente")
      setCheckedIds(new Set())
    } else {
      toast.error(result.error ?? "Error al enviar la solicitud")
    }
  }

  // Editable sheet state
  const [editStatus, setEditStatus] = useState<string>("pending")
  const [editCounterpartyId, setEditCounterpartyId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editTaxRate, setEditTaxRate] = useState<string>("")
  const [editTaxAmount, setEditTaxAmount] = useState<string>("")
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingCounterparty, setSavingCounterparty] = useState(false)
  const [savingTax, setSavingTax] = useState(false)

  useEffect(() => {
    if (!selected) {
      setInvoices([])
      return
    }
    setInvoicesLoading(true)
    setEditStatus(selected.entryStatus ?? "pending")
    setEditCounterpartyId(selected.counterparty?.id ?? null)
    setEditNotes(selected.entryNotes ?? "")
    setEditTaxRate(selected.taxRate !== null ? String(selected.taxRate) : "")
    setEditTaxAmount(selected.taxAmount !== null ? String(selected.taxAmount) : "")
    getTransactionInvoicesAction(selected.id)
      .then((result) => {
        if (result.success) setInvoices(result.data)
      })
      .finally(() => setInvoicesLoading(false))
  }, [selected?.id])

  async function handleStatusChange(newStatus: string) {
    if (!selected) return
    setSavingStatus(true)
    const result = await updateClientEntryAction(clientId, selected.id, { status: newStatus as "pending" | "verified" | "excluded" })
    setSavingStatus(false)
    if (result.success) {
      setEditStatus(newStatus)
      toast.success("Estado actualizado")
    } else {
      toast.error(result.error ?? "Error al guardar")
    }
  }

  async function handleCounterpartyChange(cpId: string | null) {
    if (!selected) return
    setSavingCounterparty(true)
    const result = await updateClientEntryAction(clientId, selected.id, { counterpartyId: cpId })
    setSavingCounterparty(false)
    if (result.success) {
      setEditCounterpartyId(cpId)
      toast.success("Proveedor actualizado")
    } else {
      toast.error(result.error ?? "Error al guardar")
    }
  }

  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNotesChange(value: string) {
    setEditNotes(value)
    if (!selected?.entryId) return
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    notesDebounceRef.current = setTimeout(async () => {
      await updateClientEntryAction(clientId, selected.id, { notes: value || null })
    }, 800)
  }

  async function handleTaxSave() {
    if (!selected) return
    setSavingTax(true)
    const parsedRate = editTaxRate === "" ? null : parseFloat(editTaxRate)
    const parsedAmount = editTaxAmount === "" ? null : parseFloat(editTaxAmount)
    const result = await updateClientEntryTaxAction(clientId, selected.id, parsedRate, parsedAmount)
    setSavingTax(false)
    if (result.success) {
      toast.success("IVA actualizado")
    } else {
      toast.error(result.error ?? "Error al guardar")
    }
  }

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
      {/* Floating bulk action bar */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">{checkedIds.size} seleccionada{checkedIds.size !== 1 ? "s" : ""}</span>
          <span className="text-sm text-muted-foreground">
            {checkedTotal.toLocaleString("es-ES", { style: "currency", currency: checkedCurrency, maximumFractionDigits: 0 })}
          </span>
          <div className="h-4 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>Estado</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryStatusAction(clientId, Array.from(checkedIds), "pending"))}>Pendiente</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryStatusAction(clientId, Array.from(checkedIds), "verified"))}>Verificado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryStatusAction(clientId, Array.from(checkedIds), "excluded"))}>Excluido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>Tipo</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTypeAction(clientId, Array.from(checkedIds), "fixed"))}>Fijo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTypeAction(clientId, Array.from(checkedIds), "variable"))}>Variable</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={bulkLoading}>IVA</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTaxAction(clientId, Array.from(checkedIds), null))}>Sin IVA</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTaxAction(clientId, Array.from(checkedIds), 0.04))}>4%</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTaxAction(clientId, Array.from(checkedIds), 0.10))}>10%</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runBulk(() => bulkUpdateClientEntryTaxAction(clientId, Array.from(checkedIds), 0.21))}>21%</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {undocumentedCheckedIds.length > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button size="sm" onClick={handleReceiptRequest} disabled={sendingRequest || bulkLoading}>
                <EnvelopeSimple className="mr-1.5 h-4 w-4" />
                {sendingRequest ? "Enviando…" : `Pedir facturas (${undocumentedCheckedIds.length})`}
              </Button>
            </>
          )}

          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setCheckedIds(new Set())} disabled={bulkLoading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              {transactions.length > 0 && (
                <Checkbox
                  checked={allSelected}
                  data-indeterminate={someSelected}
                  onCheckedChange={toggleSelectAll}
                />
              )}
            </TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead>IVA</TableHead>
            <TableHead>Comprobante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx, txIndex) => {
            const needsReceipt = tx.expenseStatus !== "documented" && tx.inboxItems.length === 0
            return (
            <TableRow
              key={tx.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelected(tx)}
            >
              <TableCell>
                <div
                  onClick={(e) => { e.stopPropagation(); toggleCheck(tx.id, txIndex, e.shiftKey) }}
                >
                  <Checkbox
                    checked={checkedIds.has(tx.id)}
                    onCheckedChange={() => {}}
                  />
                </div>
              </TableCell>
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
              <TableCell onClick={(e) => e.stopPropagation()}>
                <VatCell tx={tx} clientId={clientId} />
              </TableCell>
              <TableCell>
                <ReceiptStatusBadge tx={tx} />
              </TableCell>
            </TableRow>
            )
          })}
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
            <div className="flex flex-col gap-5 px-4 pb-4 overflow-y-auto">

              {/* Read-only meta */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Fecha</p>
                  <p className="font-medium">{format(new Date(selected.date), "d MMMM yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Cuenta</p>
                  <p className="font-medium truncate">{selected.accountName}</p>
                </div>
              </div>

              {selected.pending && (
                <Badge variant="secondary" className="text-xs w-fit">Pendiente de confirmación bancaria</Badge>
              )}

              {selected.entryId && (
                <div className="flex flex-col gap-4">

                  {/* Tipo + Estado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Tipo</p>
                      <ExpenseTypeBadge type={selected.expenseType} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Estado</p>
                      <Select value={editStatus} onValueChange={handleStatusChange} disabled={savingStatus}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="verified">Verificado</SelectItem>
                          <SelectItem value="excluded">Excluido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* IVA */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">IVA</p>
                    <div className="flex gap-2">
                      <Select
                        value={editTaxRate === "" ? "none" : editTaxRate}
                        onValueChange={async (v) => {
                          const newRate = v === "none" ? null : parseFloat(v)
                          const rateStr = newRate === null ? "" : String(newRate)
                          const gross = Math.abs(selected.amount)
                          const newAmount = newRate ? Math.round(gross * newRate / (1 + newRate) * 100) / 100 : null
                          const amountStr = newAmount === null ? "" : String(newAmount)
                          setEditTaxRate(rateStr)
                          setEditTaxAmount(amountStr)
                          setSavingTax(true)
                          await updateClientEntryTaxAction(clientId, selected.id, newRate, newAmount)
                          setSavingTax(false)
                        }}
                        disabled={savingTax}
                      >
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue placeholder="Sin IVA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin IVA</SelectItem>
                          {SPANISH_IVA_RATES.filter((r) => r > 0).map((r) => (
                            <SelectItem key={r} value={String(r)}>{Math.round(r * 100)}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={editTaxAmount}
                        onChange={(e) => setEditTaxAmount(e.target.value)}
                        onBlur={handleTaxSave}
                        placeholder="0.00 €"
                        className="h-8 text-sm w-[100px]"
                        disabled={savingTax}
                      />
                    </div>
                  </div>

                  {/* Proveedor */}
                  {counterparties.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Proveedor / Cliente</p>
                      <Select
                        value={editCounterpartyId ?? "none"}
                        onValueChange={(v) => handleCounterpartyChange(v === "none" ? null : v)}
                        disabled={savingCounterparty}
                      >
                        <SelectTrigger className="h-8 text-sm w-full">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {counterparties.map((cp) => (
                            <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Notas</p>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Añade notas sobre esta transacción…"
                      className="text-sm min-h-[72px] shadow-none resize-none"
                    />
                  </div>

                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Facturas y comprobantes</p>
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
                        {item.source === "telegram" ? (
                          <TelegramLogo className="h-4 w-4 text-sky-500 shrink-0" />
                        ) : item.source === "whatsapp" ? (
                          <WhatsappLogo className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.source}</p>
                        </div>
                        <a
                          href={`/api/inbox/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={`/api/inbox/${item.id}`}
                          download={item.fileName}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        >
                          <DownloadSimple className="h-4 w-4" />
                        </a>
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
