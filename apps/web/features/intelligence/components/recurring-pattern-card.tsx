"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  Repeat,
  Calendar,
  CurrencyDollar,
  Trash,
  Check,
  X,
  Pause,
  Play,
} from "@phosphor-icons/react"
import {
  confirmPatternAction,
  dismissPatternAction,
  pausePatternAction,
  resumePatternAction,
  deletePatternAction,
} from "../actions/manage-pattern"
import type { RecurringPatternWithRelations } from "../queries/get-recurring-patterns"
import { useTranslations } from "next-intl"
import { formatCurrency } from "@/lib/format-currency"

type PatternState = "suggestion" | "active" | "paused"
type FrequencyKey = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

interface RecurringPatternCardProps {
  pattern: RecurringPatternWithRelations
  state?: PatternState
  currency?: string
}

export function RecurringPatternCard({
  pattern,
  state = "active",
  currency = "EUR",
}: RecurringPatternCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations("recurring")
  const tc = useTranslations("common")

  const withLoading = (action: () => Promise<unknown>) => async () => {
    setLoading(true)
    await action()
    setLoading(false)
    router.refresh()
  }

  const handleConfirm = withLoading(() => confirmPatternAction(pattern.id))
  const handleDismiss = withLoading(() => dismissPatternAction(pattern.id))
  const handlePause = withLoading(() => pausePatternAction(pattern.id))
  const handleResume = withLoading(() => resumePatternAction(pattern.id))
  const handleDelete = withLoading(() => deletePatternAction(pattern.id))

  const getNextExpectedDate = () => {
    if (!pattern.lastOccurrence) return null

    const next = new Date(pattern.lastOccurrence)

    switch (pattern.frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7)
        break
      case "biweekly":
        next.setDate(next.getDate() + 14)
        break
      case "monthly":
        next.setMonth(next.getMonth() + 1)
        if (pattern.expectedDayOfMonth) next.setDate(pattern.expectedDayOfMonth)
        break
      case "quarterly":
        next.setMonth(next.getMonth() + 3)
        break
      case "yearly":
        next.setFullYear(next.getFullYear() + 1)
        break
    }

    return next
  }

  const getPauseReasonText = () => {
    if (!pattern.pausedAt) return null
    const pauseDate = new Date(pattern.pausedAt).toLocaleDateString()
    if (pattern.pauseReason === "missed_payment") {
      return t("pausedMissedPayment", { date: pauseDate })
    }
    return t("pausedOn", { date: pauseDate })
  }

  const nextDate = getNextExpectedDate()
  const pauseReasonText = getPauseReasonText()

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{pattern.name}</h3>
                {state === "suggestion" && (
                  <Badge variant="secondary" className="text-xs">
                    {t("suggested")}
                  </Badge>
                )}
                {state === "paused" && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t("paused")}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Repeat className="h-3.5 w-3.5" />
                  {t(`frequency.${pattern.frequency as FrequencyKey}`)}
                </span>

                {pattern.expectedDayOfMonth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("day", { day: pattern.expectedDayOfMonth })}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <CurrencyDollar className="h-3.5 w-3.5" />
                  {formatCurrency(pattern.expectedAmount ?? 0, currency)}
                </span>

                {pattern.category && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: pattern.category.color,
                      color: pattern.category.color,
                    }}
                  >
                    {pattern.category.name}
                  </Badge>
                )}
              </div>

              {state === "active" && nextDate && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("nextExpected", { date: nextDate.toLocaleDateString() })}
                </p>
              )}

              {state === "paused" && pauseReasonText && (
                <p className="text-xs text-amber-600 mt-2">
                  {pauseReasonText}
                </p>
              )}

              {state === "suggestion" && pattern.confidenceScore !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("confidence", { percent: Math.round(pattern.confidenceScore * 100) })}
                  {" • "}
                  {t("occurrences", { count: pattern.occurrenceCount })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {state === "suggestion" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleConfirm}
                  disabled={loading}
                  title={t("confirmPattern")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  disabled={loading}
                  title={t("dismissSuggestion")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}

            {state === "active" && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      title={t("pausePattern")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("pauseDialog.title")}</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground">
                          {t("pauseDialog.description", { name: pattern.name })}
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>{t("pauseDialog.removeFromTotal")}</li>
                            <li>{t("pauseDialog.stopExpecting")}</li>
                            <li>{t("pauseDialog.keepHistorical")}</li>
                          </ul>
                          <p className="mt-2">
                            {t("pauseDialog.manualResume")}
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePause}>
                        {tc("actions.pause")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      title={t("deletePattern")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deleteDialog.description", { name: pattern.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {tc("actions.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {state === "paused" && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      title={t("resumePattern")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("resumeDialog.title")}</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground">
                          {t("resumeDialog.description", { name: pattern.name })}
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>{t("resumeDialog.addBackToTotal")}</li>
                            <li>{t("resumeDialog.startExpecting")}</li>
                            <li>{t("resumeDialog.includeInAnalytics")}</li>
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResume}>
                        {tc("actions.resume")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading}
                      title={t("deletePattern")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deleteDialog.description", { name: pattern.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {tc("actions.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
    </div>
  )
}
