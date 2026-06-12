"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@polso/ui/card"
import { Button } from "@polso/ui/button"
import { Badge } from "@polso/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@polso/ui/alert-dialog"
import { ArrowsClockwise, Trash, Warning, CheckCircle, Clock } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { syncTransactionsAction } from "@/features/banking/actions/sync-transactions"
import { disconnectBankAction } from "@/features/banking/actions/connect-bank"
import type { Account } from "@/lib/types"
import { formatCurrency as formatCurrencyUtil } from "@/lib/format-currency"

interface AccountWithCount extends Account {
  _count: {
    transactions: number
  }
}

interface BankAccountCardProps {
  account: AccountWithCount
}

function formatCurrency(amount: number | null, currency = "EUR") {
  if (amount === null) return "—"
  return formatCurrencyUtil(amount, currency)
}

export function BankAccountCard({ account }: BankAccountCardProps) {
  const router = useRouter()
  const t = useTranslations("banking")
  const tc = useTranslations("common")
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleSync() {
    setSyncing(true)
    const result = await syncTransactionsAction(account.id)
    if (!result.success && result.code === "RATE_LIMITED") {
      toast.info(t("sync.cooldown"))
    }
    setSyncing(false)
    router.refresh()
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnectBankAction(account.id)
    setDisconnecting(false)
    router.refresh()
  }

  const isDisconnected = account.status === "disconnected"

  const statusBadge = {
    active: { variant: "default" as const, icon: CheckCircle, label: t("accountCard.statusActive") },
    pending: { variant: "secondary" as const, icon: Clock, label: t("accountCard.statusPending") },
    expired: { variant: "destructive" as const, icon: Warning, label: t("accountCard.statusExpired") },
    error: { variant: "destructive" as const, icon: Warning, label: t("accountCard.statusError") },
    disconnected: { variant: "secondary" as const, icon: Warning, label: t("accountCard.statusDisconnected") },
  }[account.status] ?? { variant: "secondary" as const, icon: Clock, label: account.status }

  const StatusIcon = statusBadge.icon

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            {account.institutionLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.institutionLogo.startsWith("data:") ? account.institutionLogo : `data:image/png;base64,${account.institutionLogo}`}
                alt={account.institutionName || t("accountCard.bank")}
                className="h-8 w-8 rounded"
              />
            ) : (
              <span className="text-lg font-semibold">
                {(account.institutionName || account.name || "B").charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{account.name}</span>
              {account.mask && (
                <span className="text-sm text-muted-foreground">
                  ••••{account.mask}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{account.institutionName || t("accountCard.bank")}</span>
              <span>•</span>
              <span className="capitalize">{account.accountSubtype || account.accountType}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>
                {t("accountCard.available")}: <span className="text-foreground font-medium">{formatCurrency(account.balanceAvailable, account.currency)}</span>
              </span>
              <span>
                {t("accountCard.current")}: <span className="text-foreground font-medium">{formatCurrency(account.balanceCurrent, account.currency)}</span>
              </span>
              <span>{t("accountCard.txns", { count: account._count.transactions })}</span>
            </div>
            {account.lastSyncedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("accountCard.lastSynced", { date: new Date(account.lastSyncedAt).toLocaleString() })}
              </p>
            )}
            {account.syncError && (
              <p className="text-xs text-destructive mt-1">
                {account.syncError}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusBadge.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusBadge.label}
          </Badge>

          {!isDisconnected && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSync}
                disabled={syncing || account.status !== "active"}
                title={t("accountCard.syncTransactions")}
              >
                <ArrowsClockwise className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disconnecting}
                    title={t("accountCard.disconnectBank")}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("accountCard.disconnectTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("accountCard.disconnectDescription", { bank: account.institutionName || t("accountCard.bank") })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("accountCard.disconnect")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
