"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Bank, MagnifyingGlass, Spinner, X } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { Input } from "@polso/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@polso/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@polso/ui/alert-dialog"
import { toast } from "@polso/ui/sonner"
import { reconnectBankAction } from "@/features/banking/actions/connect-bank"
import type { BankProvider } from "@polso/banking"

interface ConnectBankDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DuplicateBank {
  institutionName: string
  existingAccountId: string
}

export function ConnectBankDialog({ open, onOpenChange }: ConnectBankDialogProps) {
  const t = useTranslations("banking")
  const tc = useTranslations("common")
  const [institutions, setInstitutions] = useState<BankProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [search, setSearch] = useState("")
  const [duplicateBank, setDuplicateBank] = useState<DuplicateBank | null>(null)
  const [reconnecting, setReconnecting] = useState(false)

  // Fetch institution list when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadInstitutions() {
      setLoading(true)
      try {
        const res = await fetch("/api/gocardless/institutions?country=ES")
        const data = await res.json() as { institutions?: BankProvider[]; error?: string }
        if (!res.ok) {
          console.error("[ConnectBankDialog] API error:", data.error)
          toast.error(t("connect.errorLoadingBanks"))
          return
        }
        setInstitutions(data.institutions ?? [])
      } catch (err) {
        console.error("[ConnectBankDialog] Fetch error:", err)
        toast.error(t("connect.errorLoadingBanks"))
      } finally {
        setLoading(false)
      }
    }

    loadInstitutions()
  }, [open, t])

  const filtered = useMemo(() => {
    if (!search.trim()) return institutions
    const q = search.toLowerCase()
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.id.toLowerCase().includes(q)
    )
  }, [institutions, search])

  async function handleSelectBank(institution: BankProvider) {
    setConnecting(true)
    try {
      const res = await fetch("/api/gocardless/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: institution.id }),
      })

      const data = await res.json() as {
        link?: string
        error?: string
        code?: string
        existingAccountId?: string
      }

      if (!res.ok) {
        if (data.code === "LIMIT_EXCEEDED") {
          toast.error(t("connect.limitExceeded"))
        } else if ((data.code === "DUPLICATE_BANK" || data.error === "DUPLICATE_BANK") && data.existingAccountId) {
          setDuplicateBank({
            institutionName: institution.name,
            existingAccountId: data.existingAccountId,
          })
        } else if (data.code === "DUPLICATE_BANK" || data.error === "DUPLICATE_BANK") {
          toast.error(t("connect.duplicateBank"))
        } else {
          throw new Error(data.error ?? "Failed to create bank connection link")
        }
        setConnecting(false)
        return
      }

      if (data.link) {
        // Keep the spinner while the browser navigates to the bank
        window.location.href = data.link
        return
      }

      setConnecting(false)
    } catch (error) {
      console.error("[ConnectBankDialog] Error creating link:", error)
      toast.error(error instanceof Error ? error.message : t("connect.errorCreatingLink"))
      setConnecting(false)
    }
  }

  async function handleReconnect() {
    if (!duplicateBank || reconnecting) return
    setReconnecting(true)
    try {
      const result = await reconnectBankAction(duplicateBank.existingAccountId)
      if (result.success) {
        // Keep the spinner while the browser navigates to the bank
        window.location.href = result.data.link
        return
      }
      toast.error(t("connect.errorReconnecting"))
    } catch (error) {
      console.error("[ConnectBankDialog] Error reconnecting:", error)
      toast.error(t("connect.errorReconnecting"))
    }
    setReconnecting(false)
    setDuplicateBank(null)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t("connect.title")}</DialogTitle>
          <DialogDescription>{t("connect.description")}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("connect.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <Bank className="h-8 w-8 mb-2 opacity-40" />
              <p>{search ? t("connect.noResults") : t("connect.noBanks")}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((institution) => (
                <Button
                  key={institution.id}
                  variant="ghost"
                  onClick={() => handleSelectBank(institution)}
                  disabled={connecting}
                  className="w-full justify-start gap-3 h-auto px-3 py-2.5"
                >
                  {institution.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={institution.logoUrl}
                      alt={institution.name}
                      className="h-8 w-8 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Bank className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{institution.name}</span>
                  {connecting && (
                    <Spinner className="h-4 w-4 animate-spin ml-auto flex-shrink-0 text-muted-foreground" />
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={!!duplicateBank}
      onOpenChange={(isOpen) => {
        if (!isOpen && !reconnecting) setDuplicateBank(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("connect.duplicateBankTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("connect.duplicateBankDescription", {
              bank: duplicateBank?.institutionName ?? t("accountCard.bank"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reconnecting}>
            {tc("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={reconnecting}
            onClick={(e) => {
              // Prevent auto-close so the spinner stays visible while reconnecting
              e.preventDefault()
              handleReconnect()
            }}
          >
            {reconnecting && <Spinner className="h-4 w-4 animate-spin" />}
            {reconnecting ? t("accountCard.reconnecting") : t("connect.duplicateBankConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
