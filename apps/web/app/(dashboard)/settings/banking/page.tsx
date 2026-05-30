import { BankConnectionCard, type BankConnection } from "@/features/settings/components/bank-connection-card"
import { ConnectBankButton } from "@/features/settings/components/connect-bank-button"
import { getAccounts } from "@/features/banking/queries/get-accounts"
import { getSubscription } from "@/features/billing/queries/get-subscription"
import { getBankConnectionCount } from "@/features/billing/queries/get-usage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@polso/ui/card"
import { UsageIndicator } from "@/components/shared/upgrade-prompt"
import { getLimit } from "@/lib/plans"
import { getTranslations } from "next-intl/server"

export default async function BankingSettingsPage() {
  const t = await getTranslations("banking")
  const [accounts, subscription, connectionCount] = await Promise.all([
    getAccounts(),
    getSubscription(),
    getBankConnectionCount(),
  ])

  const plan = subscription?.plan ?? "starter"
  const maxConnections = getLimit(plan, "maxBankConnections")

  // Group accounts by requisitionId (one requisition = one bank connection, may have multiple accounts)
  const connectionMap = new Map<string, BankConnection>()
  for (const account of accounts) {
    const key = account.requisitionId ?? account.id
    const existing = connectionMap.get(key)
    if (existing) {
      existing.accounts.push(account)
    } else {
      connectionMap.set(key, {
        requisitionId: account.requisitionId ?? null,
        institutionName: account.institutionName,
        institutionLogo: account.institutionLogo,
        accounts: [account],
      })
    }
  }

  const connections = Array.from(connectionMap.values())

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("settings.connectNewBank")}</CardTitle>
                <CardDescription>
                  {t("settings.connectNewBankDescription")}
                </CardDescription>
              </div>
              <UsageIndicator
                limit="maxBankConnections"
                currentCount={connectionCount}
                maxAllowed={maxConnections}
                showUpgradeAt={80}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ConnectBankButton />
          </CardContent>
        </Card>

        {connections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("settings.connectedAccounts")}</h2>
            <div className="space-y-3">
              {connections.map((connection) => (
                <BankConnectionCard
                  key={connection.requisitionId ?? connection.accounts[0].id}
                  connection={connection}
                />
              ))}
            </div>
          </div>
        )}

        {connections.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground">
                {t("settings.emptyTitle")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.emptyDescription")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
