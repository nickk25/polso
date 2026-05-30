import { Card, CardContent, CardHeader, CardTitle } from "@polso/ui/card"
import { Repeat, Lightbulb, CurrencyDollar, Pause } from "@phosphor-icons/react/dist/ssr"
import { RecurringPatternCard } from "@/features/intelligence/components/recurring-pattern-card"
import { DetectPatternsButton } from "@/features/intelligence/components/detect-patterns-button"
import {
  getConfirmedPatterns,
  getSuggestedPatterns,
  getPausedPatterns,
  getMonthlyRecurringTotal,
} from "@/features/intelligence/queries/get-recurring-patterns"
import { getTranslations } from "next-intl/server"

export default async function RecurringPage() {
  const t = await getTranslations("recurring")
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
                <p className="text-xs text-muted-foreground">{t("monthlyTotal")}</p>
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
                <p className="text-xs text-muted-foreground">{t("active")}</p>
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
                <p className="text-xs text-muted-foreground">{t("toReview")}</p>
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
                <p className="text-xs text-muted-foreground">{t("paused")}</p>
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
            <h2 className="text-lg font-semibold">{t("suggestionsForReview")}</h2>
            <span className="text-sm text-muted-foreground">
              ({suggestedPatterns.length})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("suggestionsDescription")}
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
            <h2 className="text-lg font-semibold">{t("activeRecurringExpenses")}</h2>
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
            <h2 className="text-lg font-semibold text-muted-foreground">{t("pausedPatterns")}</h2>
            <span className="text-sm text-muted-foreground">
              ({pausedPatterns.length})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pausedDescription")}
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
            <h3 className="text-lg font-medium">{t("emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              {t("emptyDescription")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
