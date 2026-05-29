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
import { syncTransactionsAction } from "@/features/banking/actions/sync-transactions"
import { disconnectBankAction } from "@/features/banking/actions/connect-bank"
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

function formatCurrency(amount: number | null, currency: string = "USD") {
  if (amount === null) return "—"
  return new Intl.NumberFormat("en-US", {
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

  const { accounts, institutionName, institutionLogo } = connection
  const firstAccount = accounts[0]
  const isDisconnected = accounts.every((a) => a.status === "disconnected")
  const hasError = accounts.some((a) => a.syncError)
  const totalTransactions = accounts.reduce((sum, a) => sum + a._count.transactions, 0)

  async function handleSync() {
    setSyncing(true)
    await syncTransactionsAction(firstAccount.id)
    setSyncing(false)
    router.refresh()
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnectBankAction(firstAccount.id)
    setDisconnecting(false)
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Connection header: institution info + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {institutionLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={institutionLogo.startsWith("data:") ? institutionLogo : `data:image/png;base64,${institutionLogo}`}
                  alt={institutionName || t("accountCard.bank")}
                  className="h-7 w-7 rounded"
                />
              ) : (
                <span className="text-base font-semibold">
                  {(institutionName || "B").charAt(0)}
                </span>
              )}
            </div>
            <div>
              <span className="font-medium">{institutionName || t("accountCard.bank")}</span>
              <p className="text-xs text-muted-foreground">
                {t("connection.accountCount", { count: accounts.length })} · {t("accountCard.txns", { count: totalTransactions })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDisconnected && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSync}
                  disabled={syncing || isDisconnected}
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
              </>
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
                    {account.mask && (
                      <span className="text-xs text-muted-foreground">••••{account.mask}</span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.accountSubtype || account.accountType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>
                      {t("accountCard.available")}: <span className="text-foreground font-medium">{formatCurrency(account.balanceAvailable, account.currency)}</span>
                    </span>
                    <span>
                      {t("accountCard.current")}: <span className="text-foreground font-medium">{formatCurrency(account.balanceCurrent, account.currency)}</span>
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
