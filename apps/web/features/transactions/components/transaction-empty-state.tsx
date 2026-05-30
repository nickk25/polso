"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Receipt, ArrowsClockwise, Plugs } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import { syncTransactionsAction } from "@/features/banking/actions/sync-transactions"

interface TransactionEmptyStateProps {
  hasConnectedBank: boolean
}

export function TransactionEmptyState({ hasConnectedBank }: TransactionEmptyStateProps) {
  const t = useTranslations("transactions")
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    await syncTransactionsAction()
    setSyncing(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
      <Receipt className="h-12 w-12 text-muted-foreground" />
      <div>
        <h3 className="text-lg font-medium">{t("emptyState.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("emptyState.description")}</p>
      </div>
      {hasConnectedBank ? (
        <Button onClick={handleSync} disabled={syncing} variant="default">
          <ArrowsClockwise className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("emptyState.syncing") : t("emptyState.syncButton")}
        </Button>
      ) : (
        <Button asChild variant="default">
          <a href="/settings/banking">
            <Plugs className="h-4 w-4 mr-2" />
            {t("emptyState.connectButton")}
          </a>
        </Button>
      )}
    </div>
  )
}
