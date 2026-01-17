import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Repeat, Lightbulb, CurrencyDollar, Pause } from "@phosphor-icons/react/dist/ssr"
import { RecurringPatternCard } from "@/features/intelligence/components/recurring-pattern-card"
import { DetectPatternsButton } from "@/features/intelligence/components/detect-patterns-button"
import {
  getConfirmedPatterns,
  getSuggestedPatterns,
  getPausedPatterns,
  getMonthlyRecurringTotal,
} from "@/features/intelligence/queries/get-recurring-patterns"

export default async function RecurringPage() {
  const [confirmedPatterns, suggestedPatterns, pausedPatterns, monthlyTotal] = await Promise.all([
    getConfirmedPatterns(),
    getSuggestedPatterns(),
    getPausedPatterns(),
    getMonthlyRecurringTotal(),
  ])

  const hasPatterns = confirmedPatterns.length > 0 || suggestedPatterns.length > 0 || pausedPatterns.length > 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recurring Expenses</h1>
          <p className="text-muted-foreground">
            Fixed expenses detected from your transaction patterns
          </p>
        </div>
        <DetectPatternsButton />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CurrencyDollar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Total</p>
                <p className="text-xl font-semibold">{formatCurrency(monthlyTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Repeat className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-semibold">{confirmedPatterns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To Review</p>
                <p className="text-xl font-semibold">{suggestedPatterns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Pause className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paused</p>
                <p className="text-xl font-semibold">{pausedPatterns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Section */}
      {suggestedPatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Suggestions for Review</h2>
            <span className="text-sm text-muted-foreground">
              ({suggestedPatterns.length})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            We detected these potential recurring expenses. Confirm to track them or dismiss if not recurring.
          </p>
          <div className="grid gap-3">
            {suggestedPatterns.map((pattern) => (
              <RecurringPatternCard
                key={pattern.id}
                pattern={pattern}
                state="suggestion"
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Patterns Section */}
      {confirmedPatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Active Recurring Expenses</h2>
            <span className="text-sm text-muted-foreground">
              ({confirmedPatterns.length})
            </span>
          </div>
          <div className="grid gap-3">
            {confirmedPatterns.map((pattern) => (
              <RecurringPatternCard key={pattern.id} pattern={pattern} state="active" />
            ))}
          </div>
        </div>
      )}

      {/* Paused Patterns Section */}
      {pausedPatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-muted-foreground">Paused</h2>
            <span className="text-sm text-muted-foreground">
              ({pausedPatterns.length})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            These patterns are no longer active. Historical expense data is preserved.
          </p>
          <div className="grid gap-3">
            {pausedPatterns.map((pattern) => (
              <RecurringPatternCard key={pattern.id} pattern={pattern} state="paused" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasPatterns && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No recurring patterns detected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              Click &quot;Detect Patterns&quot; to analyze your transactions and find recurring expenses like subscriptions and bills.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
