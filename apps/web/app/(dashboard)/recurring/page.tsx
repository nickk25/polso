import { Card, CardContent } from "@polso/ui/card"
import { Repeat, Lightbulb, Pause } from "@phosphor-icons/react/dist/ssr"
import { RecurringPatternCard } from "@/features/intelligence/components/recurring-pattern-card"
import { DetectPatternsButton } from "@/features/intelligence/components/detect-patterns-button"
import { getAllPatternsGrouped, computeMonthlyTotal } from "@/features/intelligence/queries/get-recurring-patterns"
import { getTranslations } from "next-intl/server"
import { formatCurrency } from "@/lib/format-currency"

export default async function RecurringPage() {
  const t = await getTranslations("recurring")
  const { confirmed, suggested, paused, currency } = await getAllPatternsGrouped()

  const monthlyTotal = computeMonthlyTotal(confirmed)
  const hasPatterns = confirmed.length > 0 || suggested.length > 0 || paused.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end">
        <DetectPatternsButton />
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("monthlyTotal")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{formatCurrency(monthlyTotal, currency)}</div>
        </Card>
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("active")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{confirmed.length}</div>
        </Card>
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("toReview")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{suggested.length}</div>
        </Card>
        <Card>
          <div className="px-4 pt-4 pb-1 text-sm font-medium text-muted-foreground">{t("paused")}</div>
          <div className="px-4 pb-4 text-2xl font-bold">{paused.length}</div>
        </Card>
      </div>

      {suggested.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">{t("suggestionsForReview")}</span>
            <span className="text-xs text-muted-foreground">({suggested.length})</span>
          </div>
          <div className="grid gap-3">
            {suggested.map((pattern) => (
              <RecurringPatternCard
                key={pattern.id}
                pattern={pattern}
                state="suggestion"
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            <span className="text-sm font-semibold">{t("activeRecurringExpenses")}</span>
            <span className="text-xs text-muted-foreground">({confirmed.length})</span>
          </div>
          <div className="grid gap-3">
            {confirmed.map((pattern) => (
              <RecurringPatternCard key={pattern.id} pattern={pattern} state="active" currency={currency} />
            ))}
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">{t("pausedPatterns")}</span>
            <span className="text-xs text-muted-foreground">({paused.length})</span>
          </div>
          <div className="grid gap-3">
            {paused.map((pattern) => (
              <RecurringPatternCard key={pattern.id} pattern={pattern} state="paused" currency={currency} />
            ))}
          </div>
        </div>
      )}

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
