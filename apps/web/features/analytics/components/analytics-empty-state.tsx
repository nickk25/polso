"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChartLine, ArrowsClockwise, Plugs } from "@phosphor-icons/react"
import { Button } from "@polso/ui/button"
import Link from "next/link"
import { syncTransactionsAction } from "@/features/banking/actions/sync-transactions"

interface AnalyticsEmptyStateProps {
  hasConnectedBank: boolean
}

export function AnalyticsEmptyState({ hasConnectedBank }: AnalyticsEmptyStateProps) {
  const t = useTranslations("analytics")
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    await syncTransactionsAction()
    setSyncing(false)
    router.refresh()
  }

  const title = hasConnectedBank ? t("analyticsNeedSync") : t("analyticsRequireData")
  const description = hasConnectedBank ? t("analyticsNeedSyncDescription") : t("analyticsRequireDataDescription")

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
      <ChartLine className="h-12 w-12 text-muted-foreground" />
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      </div>
      {hasConnectedBank ? (
        <Button onClick={handleSync} disabled={syncing}>
          <ArrowsClockwise className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("syncing") : t("syncBank")}
        </Button>
      ) : (
        <Button asChild>
          <Link href="/settings/banking">
            <Plugs className="h-4 w-4 mr-2" />
            {t("connectBankAccount")}
          </Link>
        </Button>
      )}
    </div>
  )
}
