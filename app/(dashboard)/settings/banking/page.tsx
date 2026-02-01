import { SettingsHeader } from "@/features/settings/components/settings-header"
import { BankAccountCard } from "@/features/settings/components/bank-account-card"
import { ConnectBankButton } from "@/features/settings/components/connect-bank-button"
import { getAccounts } from "@/features/banking/queries/get-accounts"
import { getSubscription } from "@/features/billing/queries/get-subscription"
import { getBankConnectionCount } from "@/features/billing/queries/get-usage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UsageIndicator } from "@/components/shared/upgrade-prompt"
import { getLimit } from "@/lib/plans"

export default async function BankingSettingsPage() {
  const [accounts, subscription, connectionCount] = await Promise.all([
    getAccounts(),
    getSubscription(),
    getBankConnectionCount(),
  ])

  const plan = subscription?.plan ?? "starter"
  const maxConnections = getLimit(plan, "maxBankConnections")

  return (
    <div className="flex flex-col gap-6 p-6">
      <SettingsHeader
        title="Bank Connections"
        description="Manage your connected bank accounts"
      />
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connect a New Bank</CardTitle>
                <CardDescription>
                  Securely connect your bank accounts via Plaid to automatically import transactions
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

        {accounts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connected Accounts</h2>
            <div className="space-y-3">
              {accounts.map((account) => (
                <BankAccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        )}

        {accounts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground">
                No bank accounts connected yet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your first bank account to start tracking your finances automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
