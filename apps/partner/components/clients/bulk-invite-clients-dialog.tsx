"use client"

import { useRef, useState, useTransition, useMemo } from "react"
import { toast } from "@polso/ui/sonner"
import { UsersThree, UploadSimple, Spinner } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Textarea } from "@polso/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@polso/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polso/ui/table"
import { parseBulkRows } from "@/features/clients/lib/parse-bulk-rows"
import { bulkInviteClientsAction } from "@/features/clients/actions/bulk-invite"
import type { BulkInviteResult } from "@/features/clients/actions/bulk-invite"

type Step = "input" | "sending" | "results"

export function BulkInviteClientsDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("input")
  const [textarea, setTextarea] = useState("")
  const [result, setResult] = useState<BulkInviteResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const { rows, invalid } = useMemo(() => parseBulkRows(textarea), [textarea])

  function handleClose() {
    if (step === "sending") return
    setOpen(false)
    setTimeout(() => {
      setStep("input")
      setTextarea("")
      setResult(null)
      if (fileRef.current) fileRef.current.value = ""
    }, 200)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      setTextarea(text)
      const { rows: parsed } = parseBulkRows(text)
      toast.success(`CSV cargado: ${parsed.length} filas válidas`)
    })
    e.target.value = ""
  }

  function handleSubmit() {
    if (rows.length === 0 || rows.length > 100) return
    setStep("sending")
    startTransition(async () => {
      const res = await bulkInviteClientsAction({ rows })
      if (res.success) {
        setResult(res.data)
        setStep("results")
      } else {
        toast.error(res.error ?? "Error al enviar las invitaciones")
        setStep("input")
      }
    })
  }

  const tooMany = rows.length > 100

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UsersThree className="mr-2 h-4 w-4" />
        Invitar varios
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invitar varios clientes</DialogTitle>
          </DialogHeader>

          {step === "input" && (
            <>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Una línea por cliente. Formato: <code className="font-mono">nombre, email</code>. Máximo 100.
                </p>

                <Textarea
                  rows={10}
                  placeholder={"Acme S.L., contacto@acme.com\nFontanería López, jose@lopez.es"}
                  value={textarea}
                  onChange={(e) => setTextarea(e.target.value)}
                  className="font-mono text-xs resize-none"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <UploadSimple className="mr-2 h-3.5 w-3.5" />
                      Subir CSV
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  <p className={`text-xs ${tooMany ? "text-destructive" : "text-muted-foreground"}`}>
                    {rows.length > 0 || invalid > 0 ? (
                      <>
                        {rows.length} {rows.length === 1 ? "cliente válido" : "clientes válidos"}
                        {invalid > 0 && ` · ${invalid} ${invalid === 1 ? "línea inválida" : "líneas inválidas"}`}
                      </>
                    ) : null}
                    {tooMany && " — máximo 100"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={rows.length === 0 || tooMany || isPending}
                >
                  Invitar a {rows.length > 0 ? rows.length : "..."}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="h-7 w-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Enviando {rows.length} {rows.length === 1 ? "invitación" : "invitaciones"}…
              </p>
            </div>
          )}

          {step === "results" && result && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{result.sent}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enviadas</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold">{result.skipped}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Omitidas</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className={`text-2xl font-bold ${result.failed > 0 ? "text-destructive" : ""}`}>
                      {result.failed}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fallidas</p>
                  </div>
                </div>

                {(result.skipped > 0 || result.failed > 0) && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                      Ver detalle ({result.skipped + result.failed} {result.skipped + result.failed === 1 ? "fila" : "filas"})
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Motivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.results
                            .filter((r) => r.status !== "sent")
                            .map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono">{r.email}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {r.reason === "duplicate_in_list"
                                    ? "Duplicado en la lista"
                                    : r.reason === "already_invited"
                                      ? "Ya invitado"
                                      : r.reason ?? "Error"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </details>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleClose}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
