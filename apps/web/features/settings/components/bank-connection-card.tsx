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
import { ArrowsClockwise, Trash, Warning, CheckCircle, Clock, ArrowCounterClockwise } from "@phosphor-icons/react"
import { toast } from "@polso/ui/sonner"
import { startManualSyncAction } from "@/features/banking/actions/sync-transactions"
import { disconnectBankAction, reconnectBankAction } from "@/features/banking/actions/connect-bank"
import type { Account } from "@/lib/types"

interface AccountWithCount extends Account {
  _count: {
    transactions: number
  }
}

export interface BankConnection {
  requisitionId: string | null
  institutionName: string | null
  institutionLogo: string | null
  accounts: AccountWithCount[]
}

interface BankConnectionCardProps {
  connection: BankConnection
}

function formatCurrency(amount: number | null, currency: string = "EUR") {
  if (amount === null) return "—"
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusConfig = {
  active: { variant: "default" as const, icon: CheckCircle },
  pending: { variant: "secondary" as const, icon: Clock },
  expired: { variant: "destructive" as const, icon: Warning },
  error: { variant: "destructive" as const, icon: Warning },
  disconnected: { variant: "secondary" as const, icon: Warning },
} as const

export function BankConnectionCard({ connection }: BankConnectionCardProps) {
  const router = useRouter()
  const t = useTranslations("banking")
  const tc = useTranslations("common")
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const { accounts, institutionName, institutionLogo } = connection
  const firstAccount = accounts[0]
  const isDisconnected = accounts.every((a) => a.status === "disconnected")
  const hasExpiredOrError = accounts.some((a) => a.status === "expired" || a.status === "error")
  const hasError = accounts.some((a) => a.syncError)
  const totalTransactions = accounts.reduce((sum, a) => sum + a._count.transactions, 0)
  // Reconnect targets the broken account so the action resolves the right institution
  const reconnectableAccount = accounts.find(
    (a) => a.status === "expired" || a.status === "error" || a.status === "disconnected"
  )

  async function handleSync() {
    setSyncing(true)
    await startManualSyncAction(firstAccount.id)
    setSyncing(false)
    // SyncMonitor toast takes over from here — no router.refresh() needed yet
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnectBankAction(firstAccount.id)
    setDisconnecting(false)
    router.refresh()
  }

  async function handleReconnect() {
    if (!reconnectableAccount) return
    setReconnecting(true)
    try {
      const result = await reconnectBankAction(reconnectableAccount.id)
      if (result.success) {
        // External GoCardless URL — keep the spinner until the browser navigates
        window.location.href = result.data.link
        return
      }
      toast.error(t("connect.errorReconnecting"))
    } catch {
      toast.error(t("connect.errorReconnecting"))
    }
    setReconnecting(false)
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Connection header: institution info + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
              {institutionLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    institutionLogo.startsWith("http")
                      ? institutionLogo
                      : institutionLogo.startsWith("data:")
                        ? institutionLogo
                        : `data:image/png;base64,${institutionLogo}`
                  }
                  alt={institutionName || t("accountCard.bank")}
                  className="h-10 w-10 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <span className="text-base font-semibold">
                    {(institutionName || "B").charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="font-medium">{institutionName || t("accountCard.bank")}</span>
              <p className="text-xs text-muted-foreground">
                {t("connection.accountCount", { count: accounts.length })} · {t("accountCard.transactions", { count: totalTransactions })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {reconnectableAccount && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReconnect}
                disabled={reconnecting}
                title={t("accountCard.reconnectBank")}
              >
                <ArrowCounterClockwise className={`h-4 w-4 ${reconnecting ? "animate-spin" : ""}`} />
              </Button>
            )}
            {!hasExpiredOrError && !isDisconnected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSync}
                disabled={syncing}
                title={t("accountCard.syncTransactions")}
              >
                <ArrowsClockwise className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            )}
            {!isDisconnected && (
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
                      {t("connection.disconnectDescription", {
                        bank: institutionName || t("accountCard.bank"),
                        count: accounts.length,
                      })}
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
            )}
          </div>
        </div>

        {/* Individual accounts within this connection */}
        <div className="space-y-1">
          {accounts.map((account) => {
            const config = statusConfig[account.status as keyof typeof statusConfig]
              ?? { variant: "secondary" as const, icon: Clock }
            const StatusIcon = config.icon

            return (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{account.name}</span>
                    {account.mask && !account.name?.includes(account.mask) && (
                      <span className="text-xs text-muted-foreground">••••{account.mask}</span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.accountSubtype || account.accountType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>
                      {t("accountCard.balance")}: <span className="text-foreground font-medium">{formatCurrency(account.balanceAvailable ?? account.balanceCurrent, account.currency)}</span>
                    </span>
                  </div>
                </div>
                <Badge variant={config.variant} className="gap-1 ml-2 shrink-0">
                  <StatusIcon className="h-3 w-3" />
                  {t(`accountCard.status${account.status.charAt(0).toUpperCase() + account.status.slice(1)}` as Parameters<typeof t>[0])}
                </Badge>
              </div>
            )
          })}
        </div>

        {/* Last synced + error */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {firstAccount.lastSyncedAt && (
            <span>{t("accountCard.lastSynced", { date: new Date(firstAccount.lastSyncedAt).toLocaleString() })}</span>
          )}
          {hasError && (
            <span className="text-destructive">
              {accounts.find((a) => a.syncError)?.syncError}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
