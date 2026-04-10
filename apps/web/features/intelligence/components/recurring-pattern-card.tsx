"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

type PatternState = "suggestion" | "active" | "paused"

interface RecurringPatternCardProps {
  pattern: RecurringPatternWithRelations
  showActions?: boolean
  state?: PatternState
}

export function RecurringPatternCard({
  pattern,
  showActions = true,
  state = "active",
}: RecurringPatternCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations("recurring")
  const tc = useTranslations("common")

  const handleConfirm = async () => {
    setLoading(true)
    await confirmPatternAction(pattern.id)
    setLoading(false)
    router.refresh()
  }

  const handleDismiss = async () => {
    setLoading(true)
    await dismissPatternAction(pattern.id)
    setLoading(false)
    router.refresh()
  }

  const handlePause = async () => {
    setLoading(true)
    await pausePatternAction(pattern.id)
    setLoading(false)
    router.refresh()
  }

  const handleResume = async () => {
    setLoading(true)
    await resumePatternAction(pattern.id)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setLoading(true)
    await deletePatternAction(pattern.id)
    setLoading(false)
    router.refresh()
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getNextExpectedDate = () => {
    if (!pattern.lastOccurrence || !pattern.expectedDayOfMonth) return null

    const last = new Date(pattern.lastOccurrence)
    const next = new Date(last)

    switch (pattern.frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7)
        break
      case "biweekly":
        next.setDate(next.getDate() + 14)
        break
      case "monthly":
        next.setMonth(next.getMonth() + 1)
        next.setDate(pattern.expectedDayOfMonth)
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
    <Card className={state === "paused" ? "opacity-75" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: pattern.category?.color
                  ? `${pattern.category.color}20`
                  : "var(--muted)",
              }}
            >
              <Repeat
                className="h-5 w-5"
                style={{ color: pattern.category?.color || "var(--muted-foreground)" }}
              />
            </div>

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
                  {t(`frequency.${pattern.frequency}` as any) || pattern.frequency}
                </span>

                {pattern.expectedDayOfMonth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("day", { day: pattern.expectedDayOfMonth })}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <CurrencyDollar className="h-3.5 w-3.5" />
                  {formatCurrency(pattern.expectedAmount)}
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

          {showActions && (
            <div className="flex items-center gap-1 shrink-0">
              {state === "suggestion" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConfirm}
                    disabled={loading}
                    title={t("confirmPattern")}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    disabled={loading}
                    title={t("dismissSuggestion")}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        className="text-destructive hover:text-destructive"
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
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                        <AlertDialogAction
                          onClick={handleResume}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
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
                        className="text-destructive hover:text-destructive"
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}
