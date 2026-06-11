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
import { toast } from "@polso/ui/sonner"
import type { BankProvider } from "@polso/banking"

interface ConnectBankDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectBankDialog({ open, onOpenChange }: ConnectBankDialogProps) {
  const t = useTranslations("banking")
  const [institutions, setInstitutions] = useState<BankProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [search, setSearch] = useState("")

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

      const data = await res.json() as { link?: string; error?: string; code?: string }

      if (!res.ok) {
        if (data.code === "LIMIT_EXCEEDED") {
          toast.error(t("connect.limitExceeded"))
        } else if (data.code === "DUPLICATE_BANK") {
          toast.error(t("connect.duplicateBank"))
        } else {
          throw new Error(data.error ?? "Failed to create bank connection link")
        }
        return
      }

      if (data.link) {
        window.location.href = data.link
      }
    } catch (error) {
      console.error("[ConnectBankDialog] Error creating link:", error)
      toast.error(error instanceof Error ? error.message : t("connect.errorCreatingLink"))
      setConnecting(false)
    }
  }

  return (
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
  )
}
