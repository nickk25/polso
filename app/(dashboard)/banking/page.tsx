import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bank, ArrowsClockwise, Trash, Warning } from "@phosphor-icons/react/dist/ssr"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/get-session"
import { BankingClient } from "./banking-client"
import { formatDistanceToNow } from "date-fns"

async function getAccounts() {
  const { organizationId } = await getAuthContext()

  const accounts = await prisma.account.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  })

  return accounts
}

function formatCurrency(amount: number | null, currency: string = "USD") {
  if (amount === null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

function AccountCard({ account }: { account: Awaited<ReturnType<typeof getAccounts>>[number] }) {
  const isError = account.status === "error"
  const isExpired = account.status === "expired"
  const isPending = account.status === "pending"

  return (
    <Card className={isError || isExpired ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {account.institutionLogo ? (
              <img
                src={account.institutionLogo.startsWith("data:") ? account.institutionLogo : `data:image/png;base64,${account.institutionLogo}`}
                alt={account.institutionName || "Bank"}
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Bank className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{account.name}</CardTitle>
              <CardDescription className="text-xs">
                {account.institutionName}
                {account.mask && ` •••• ${account.mask}`}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              isError || isExpired ? "destructive" :
              isPending ? "secondary" :
              "default"
            }
          >
            {account.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-lg font-semibold">
              {formatCurrency(account.balanceAvailable, account.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg font-semibold">
              {formatCurrency(account.balanceCurrent, account.currency)}
            </p>
          </div>
        </div>

        {(isError || isExpired) && account.syncError && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <Warning className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{account.syncError}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {account._count.transactions} transactions
          </span>
          {account.lastSyncedAt && (
            <span>
              Synced {formatDistanceToNow(account.lastSyncedAt, { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AccountsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function AccountsList() {
  const accounts = await getAccounts()

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Bank className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No bank accounts connected</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
            Connect your bank account to automatically sync transactions and track expenses
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account: Awaited<ReturnType<typeof getAccounts>>[number]) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}

export default function BankingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Banking</h1>
          <p className="text-muted-foreground">
            Connect and manage your bank accounts
          </p>
        </div>
        <BankingClient />
      </div>

      <Suspense fallback={<AccountsSkeleton />}>
        <AccountsList />
      </Suspense>
    </div>
  )
}
